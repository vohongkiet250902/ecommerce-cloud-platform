import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { InventoryLot } from './schemas/inventory-lot.schema';
import { Product } from '../products/schemas/product.schema';
import { StockInDto } from './dto/stock-in.dto';

export type AllocatedLotItem = {
  lotId: Types.ObjectId;
  quantity: number;
  unitCost: number;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLot>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  private isTransactionNotSupported(error: any) {
    const msg = String(error?.message || '').toLowerCase();
    return (
      msg.includes(
        'transaction numbers are only allowed on a replica set member or mongos',
      ) ||
      msg.includes('replica set') ||
      msg.includes('mongos')
    );
  }

  private async getProductAndVariant(
    productId: string,
    sku: string,
    session?: ClientSession,
  ) {
    const query = this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      'variants.sku': sku,
    });

    if (session) query.session(session);

    const product = await query;
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm hoặc SKU');
    }

    const variant = product.variants.find((v) => v.sku === sku);
    if (!variant) {
      throw new NotFoundException('Không tìm thấy variant');
    }

    return { product, variant };
  }

  /**
   * Hỗ trợ dữ liệu cũ:
   * Nếu ProductVariant.stock đang có số lượng nhưng chưa có lot tương ứng,
   * tự sinh 1 lot opening_balance để hệ thống mới vẫn chạy được.
   */
  private async backfillOpeningLotIfNeeded(
    productId: Types.ObjectId,
    sku: string,
    currentVariantStock: number,
    session?: ClientSession,
  ) {
    const agg = this.inventoryLotModel.aggregate([
      {
        $match: {
          productId,
          sku,
        },
      },
      {
        $group: {
          _id: null,
          totalRemaining: { $sum: '$remainingQuantity' },
        },
      },
    ]);

    if (session) {
      agg.session(session);
    }

    const result = await agg;
    const totalRemaining = result?.[0]?.totalRemaining ?? 0;
    const gap = currentVariantStock - totalRemaining;

    if (gap > 0) {
      await this.inventoryLotModel.create(
        [
          {
            productId,
            sku,
            unitCost: 0,
            originalQuantity: gap,
            remainingQuantity: gap,
            receivedAt: new Date(),
            sourceType: 'opening_balance',
            sourceRef: 'LEGACY_BACKFILL',
            note: 'Tự sinh từ stock cũ trước khi áp dụng inventory lot',
            isClosed: false,
          },
        ],
        session ? { session } : undefined,
      );
    }
  }

  private async createStockIn(
    dto: StockInDto,
    session?: ClientSession,
  ): Promise<InventoryLot | null> {
    const { product, variant } = await this.getProductAndVariant(
      dto.productId,
      dto.sku,
      session,
    );

    const lotDocs = await this.inventoryLotModel.create(
      [
        {
          productId: product._id,
          sku: dto.sku,
          unitCost: dto.unitCost,
          sellingPrice: dto.sellingPrice,
          originalQuantity: dto.quantity,
          remainingQuantity: dto.quantity,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
          sourceType: dto.sourceType ?? 'purchase',
          sourceRef: dto.sourceRef,
          note: dto.note,
          isClosed: false,
        },
      ],
      session ? { session } : undefined,
    );

    const createdLot = lotDocs[0];

    const newPrice = dto.sellingPrice !== undefined ? dto.sellingPrice : variant.price;
    const discount = variant.discountPercentage || 0;
    const finalPrice = Math.round(newPrice * (1 - discount / 100));

    const updated = await this.productModel.updateOne(
      { _id: product._id, 'variants.sku': dto.sku },
      {
        $inc: {
          'variants.$.stock': dto.quantity,
          totalStock: dto.quantity,
        },
        $set: {
          'variants.$.importPrice': dto.unitCost,
          'variants.$.price': newPrice,
          'variants.$.finalPrice': finalPrice,
        },
      },
      session ? { session } : undefined,
    );

    if (updated.modifiedCount === 0) {
      throw new BadRequestException('Không thể cập nhật tồn kho sản phẩm');
    }

    return createdLot;
  }

  async stockIn(dto: StockInDto) {
    const session = await this.inventoryLotModel.db.startSession();
    try {
      let createdLot: InventoryLot | null = null;

      try {
        await session.withTransaction(async () => {
          createdLot = await this.createStockIn(dto, session);
        });
      } catch (error: any) {
        if (this.isTransactionNotSupported(error)) {
          createdLot = await this.createStockIn(dto);
        } else {
          throw error;
        }
      }

      return createdLot;
    } finally {
      await session.endSession();
    }
  }

  async allocateFifo(
    productId: string,
    sku: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<{ allocations: AllocatedLotItem[]; totalCost: number }> {
    if (quantity <= 0) {
      throw new BadRequestException('Số lượng xuất kho phải lớn hơn 0');
    }

    const { product, variant } = await this.getProductAndVariant(
      productId,
      sku,
      session,
    );

    await this.backfillOpeningLotIfNeeded(
      product._id as Types.ObjectId,
      sku,
      variant.stock || 0,
      session,
    );

    const lotsQuery = this.inventoryLotModel
      .find({
        productId: product._id,
        sku,
        remainingQuantity: { $gt: 0 },
      })
      .sort({ receivedAt: 1, createdAt: 1 });

    if (session) lotsQuery.session(session);

    const lots = await lotsQuery;
    const totalAvailable = lots.reduce(
      (sum, lot) => sum + lot.remainingQuantity,
      0,
    );

    if (totalAvailable < quantity) {
      throw new BadRequestException(
        `SKU ${sku} không đủ tồn kho theo lot. Có ${totalAvailable}, cần ${quantity}`,
      );
    }

    let need = quantity;
    let totalCost = 0;
    const allocations: AllocatedLotItem[] = [];

    for (const lot of lots) {
      if (need <= 0) break;

      const take = Math.min(need, lot.remainingQuantity);

      const updated = await this.inventoryLotModel.updateOne(
        {
          _id: lot._id,
          remainingQuantity: { $gte: take },
        },
        {
          $inc: { remainingQuantity: -take },
          $set: { isClosed: lot.remainingQuantity - take === 0 },
        },
        session ? { session } : undefined,
      );

      if (updated.modifiedCount === 0) {
        throw new BadRequestException(`Race condition khi trừ lot ${lot._id}`);
      }

      allocations.push({
        lotId: lot._id as Types.ObjectId,
        quantity: take,
        unitCost: lot.unitCost,
      });

      totalCost += take * lot.unitCost;
      need -= take;
    }

    const updatedProduct = await this.productModel.updateOne(
      {
        _id: product._id,
        'variants.sku': sku,
        'variants.stock': { $gte: quantity },
      },
      {
        $inc: {
          'variants.$.stock': -quantity,
          totalStock: -quantity,
        },
      },
      session ? { session } : undefined,
    );

    if (updatedProduct.modifiedCount === 0) {
      throw new BadRequestException(
        `Không thể đồng bộ stock trên Product cho SKU ${sku}`,
      );
    }

    return { allocations, totalCost };
  }

  async releaseAllocations(
    productId: string,
    sku: string,
    allocations: AllocatedLotItem[],
    session?: ClientSession,
  ) {
    if (!allocations?.length) return;

    let totalQty = 0;

    for (const alloc of allocations) {
      totalQty += alloc.quantity;

      await this.inventoryLotModel.updateOne(
        { _id: alloc.lotId },
        {
          $inc: { remainingQuantity: alloc.quantity },
          $set: { isClosed: false },
        },
        session ? { session } : undefined,
      );
    }

    const updated = await this.productModel.updateOne(
      { _id: new Types.ObjectId(productId), 'variants.sku': sku },
      {
        $inc: {
          'variants.$.stock': totalQty,
          totalStock: totalQty,
        },
      },
      session ? { session } : undefined,
    );

    if (updated.modifiedCount === 0) {
      throw new BadRequestException('Không thể hoàn lại stock cho Product');
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Analytics helpers
  // ─────────────────────────────────────────────────────────────

  private normalizeStatsGroupBy(groupBy?: string): 'day' | 'week' | 'month' {
    if (groupBy === 'week' || groupBy === 'month') return groupBy;
    return 'day';
  }

  private clampPositiveInt(value: any, fallback: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private resolveStatsRangeValue(
    groupBy: 'day' | 'week' | 'month',
    range?: { days?: number; weeks?: number; months?: number },
  ) {
    if (groupBy === 'week') {
      return this.clampPositiveInt(range?.weeks, 12, 104);
    }
    if (groupBy === 'month') {
      return this.clampPositiveInt(range?.months, 12, 60);
    }
    return this.clampPositiveInt(range?.days, 30, 366);
  }

  private buildStatsStartDate(
    groupBy: 'day' | 'week' | 'month',
    range?: { days?: number; weeks?: number; months?: number },
  ) {
    const value = this.resolveStatsRangeValue(groupBy, range);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (groupBy === 'day') {
      start.setDate(start.getDate() - (value - 1));
      return { start, value };
    }

    if (groupBy === 'week') {
      const dayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dayOffset - (value - 1) * 7);
      return { start, value };
    }

    start.setDate(1);
    start.setMonth(start.getMonth() - (value - 1));
    return { start, value };
  }

  private buildPeriodGroupExpr(
    field: string,
    groupBy: 'day' | 'week' | 'month',
  ) {
    const dateRef = `$${field}`;

    if (groupBy === 'day') {
      return {
        $dateToString: {
          format: '%Y-%m-%d',
          date: dateRef,
          timezone: 'Asia/Ho_Chi_Minh',
        },
      };
    }

    if (groupBy === 'week') {
      return {
        year: { $isoWeekYear: dateRef },
        week: { $isoWeek: dateRef },
      };
    }

    return {
      $dateToString: {
        format: '%Y-%m',
        date: dateRef,
        timezone: 'Asia/Ho_Chi_Minh',
      },
    };
  }

  private buildPeriodProjectExpr(
    groupBy: 'day' | 'week' | 'month',
    sourcePath = '$_id',
  ): Record<string, any> {
    if (groupBy === 'day' || groupBy === 'month') {
      return { period: sourcePath };
    }

    return {
      period: {
        $concat: [
          { $toString: `${sourcePath}.year` },
          '-W',
          {
            $cond: [
              { $lt: [`${sourcePath}.week`, 10] },
              { $concat: ['0', { $toString: `${sourcePath}.week` }] },
              { $toString: `${sourcePath}.week` },
            ],
          },
        ],
      },
    };
  }

  async getStockInStats(
    groupBy: 'day' | 'week' | 'month' = 'day',
    range?: { days?: number; weeks?: number; months?: number },
  ) {
    const normalizedGroupBy = this.normalizeStatsGroupBy(groupBy);
    const { start, value } = this.buildStatsStartDate(normalizedGroupBy, range);

    const items = await this.inventoryLotModel.aggregate([
      {
        $match: {
          receivedAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: this.buildPeriodGroupExpr('receivedAt', normalizedGroupBy),
          lotCount: { $sum: 1 },
          totalQuantity: { $sum: '$originalQuantity' },
          totalRemainingQuantity: { $sum: '$remainingQuantity' },
          totalStockInCost: {
            $sum: {
              $multiply: [
                { $ifNull: ['$originalQuantity', 0] },
                { $ifNull: ['$unitCost', 0] },
              ],
            },
          },
          sourceTypes: { $addToSet: '$sourceType' },
        },
      },
      {
        $project: {
          _id: 0,
          ...this.buildPeriodProjectExpr(normalizedGroupBy),
          lotCount: 1,
          totalQuantity: 1,
          totalRemainingQuantity: 1,
          totalStockInCost: 1,
          sourceTypes: 1,
          averageUnitCost: {
            $cond: [
              { $gt: ['$totalQuantity', 0] },
              { $divide: ['$totalStockInCost', '$totalQuantity'] },
              0,
            ],
          },
        },
      },
      { $sort: { period: 1 } },
    ]);

    const summary = items.reduce(
      (acc: any, item: any) => {
        acc.totalLots += item.lotCount || 0;
        acc.totalQuantity += item.totalQuantity || 0;
        acc.totalRemainingQuantity += item.totalRemainingQuantity || 0;
        acc.totalStockInCost += item.totalStockInCost || 0;
        return acc;
      },
      {
        totalLots: 0,
        totalQuantity: 0,
        totalRemainingQuantity: 0,
        totalStockInCost: 0,
      },
    );

    summary.averageUnitCost =
      summary.totalQuantity > 0
        ? summary.totalStockInCost / summary.totalQuantity
        : 0;

    return {
      groupBy: normalizedGroupBy,
      range: value,
      items,
      summary,
    };
  }

  async listLots(productId?: string, sku?: string) {
    const match: any = {};
    if (productId) match.productId = new Types.ObjectId(productId);
    if (sku) match.sku = sku;

    return this.inventoryLotModel.aggregate([
      { $match: match },
      { $sort: { receivedAt: -1, createdAt: -1 } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          variant: {
            $filter: {
              input: '$product.variants',
              as: 'v',
              cond: { $eq: ['$$v.sku', '$sku'] },
            },
          },
        },
      },
      { $unwind: { path: '$variant', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          productId: {
            _id: '$product._id',
            name: '$product.name',
            images: '$product.images',
          },
          sku: 1,
          unitCost: 1,
          sellingPrice: 1,
          originalQuantity: 1,
          remainingQuantity: 1,
          receivedAt: 1,
          sourceType: 1,
          sourceRef: 1,
          note: 1,
          isClosed: 1,
          variant: {
            sku: 1,
            attributes: { $ifNull: ['$variant.attributes', '$variant.val'] },
            image: 1,
          },
          imageUrl: '$variant.image.url',
        },
      },
    ]);
  }
}
