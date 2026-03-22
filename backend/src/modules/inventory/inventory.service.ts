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
        { session },
      );
    }
  }

  async stockIn(dto: StockInDto) {
    const session = await this.inventoryLotModel.db.startSession();
    try {
      let createdLot: InventoryLot | null = null;

      await session.withTransaction(async () => {
        const { product } = await this.getProductAndVariant(
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
              originalQuantity: dto.quantity,
              remainingQuantity: dto.quantity,
              receivedAt: dto.receivedAt
                ? new Date(dto.receivedAt)
                : new Date(),
              sourceType: dto.sourceType ?? 'purchase',
              sourceRef: dto.sourceRef,
              note: dto.note,
              isClosed: false,
            },
          ],
          { session },
        );

        createdLot = lotDocs[0];

        const updated = await this.productModel.updateOne(
          { _id: product._id, 'variants.sku': dto.sku },
          {
            $inc: {
              'variants.$.stock': dto.quantity,
              totalStock: dto.quantity,
            },
          },
          { session },
        );

        if (updated.modifiedCount === 0) {
          throw new BadRequestException('Không thể cập nhật tồn kho sản phẩm');
        }
      });

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

  async listLots(productId?: string, sku?: string) {
    const filter: any = {};
    if (productId) filter.productId = new Types.ObjectId(productId);
    if (sku) filter.sku = sku;

    return this.inventoryLotModel
      .find(filter)
      .sort({ receivedAt: 1, createdAt: 1 });
  }
}
