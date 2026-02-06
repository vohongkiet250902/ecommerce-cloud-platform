import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { Product } from '../products/schemas/product.schema';
import { ORDER_STATUSES } from './dto/update-order.dto';

type PaginationInput = { page: number; limit: number };
type AdminFindAllInput = PaginationInput & { status?: string; userId?: string };
type UserFindInput = PaginationInput & { status?: string };

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  private toObjectId(id: string, field = 'id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${field} không hợp lệ`);
    }
    return new Types.ObjectId(id);
  }

  private clampLimit(limit: number, max: number, fallback = 20) {
    if (!Number.isFinite(limit)) return Math.min(fallback, max);
    return Math.max(1, Math.min(limit, max));
  }

  private ensureValidStatus(status: string): asserts status is OrderStatus {
    if (!ORDER_STATUSES.includes(status as any)) {
      throw new BadRequestException('status không hợp lệ');
    }
  }

  private normalizeItems(items: CreateOrderItemDto[]) {
    // merge duplicates by (productId, sku)
    const map = new Map<string, CreateOrderItemDto>();
    for (const it of items) {
      const key = `${it.productId}:${it.sku}`;
      const existing = map.get(key);
      if (existing) existing.quantity += it.quantity;
      else map.set(key, { ...it });
    }
    return Array.from(map.values());
  }

  private validateIdempotencyKey(key?: string) {
    if (!key) return undefined;
    const trimmed = String(key).trim();
    if (trimmed.length < 8 || trimmed.length > 128) {
      throw new BadRequestException('Idempotency-Key không hợp lệ');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      throw new BadRequestException('Idempotency-Key không hợp lệ');
    }
    return trimmed;
  }

  private async atomicDeductStock(
    productId: Types.ObjectId,
    sku: string,
    quantity: number,
    session?: ClientSession,
  ) {
    const result = await this.productModel.updateOne(
      {
        _id: productId,
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
    return result.modifiedCount === 1;
  }

  private async rollbackStock(
    deducted: Array<{ productId: Types.ObjectId; sku: string; qty: number }>,
    session?: ClientSession,
  ) {
    if (!deducted.length) return;

    const ops = deducted.map((d) => ({
      updateOne: {
        filter: { _id: d.productId, 'variants.sku': d.sku },
        update: { $inc: { 'variants.$.stock': d.qty, totalStock: d.qty } },
      },
    }));

    await this.productModel.bulkWrite(ops, session ? { session } : undefined);
  }

  /**
   * Transactions require replica set. If not supported, fallback will kick in.
   */
  private async tryWithTransaction<T>(fn: (s: ClientSession) => Promise<T>) {
    const session = await this.orderModel.db.startSession();
    try {
      let out: T | undefined;
      await session.withTransaction(async () => {
        out = await fn(session);
      });
      return out as T;
    } finally {
      session.endSession();
    }
  }

  async create(userId: string, dto: CreateOrderDto, idempotencyKey?: string) {
    const uid = this.toObjectId(userId, 'userId');
    const key = this.validateIdempotencyKey(idempotencyKey);

    // If key exists, return existing order (fast-path)
    if (key) {
      const existing = await this.orderModel
        .findOne({ userId: uid, idempotencyKey: key })
        .lean();
      if (existing) return existing;
    }

    const items = this.normalizeItems(dto.items);
    if (!items.length)
      throw new BadRequestException('Đơn hàng không có sản phẩm');

    // === Transaction path (production) ===
    try {
      const result = await this.tryWithTransaction(async (session) => {
        // re-check in tx (race-safe)
        if (key) {
          const existing = await this.orderModel
            .findOne({ userId: uid, idempotencyKey: key })
            .session(session)
            .lean();
          if (existing) return existing;
        }

        let totalAmount = 0;
        const orderItems: any[] = [];

        for (const item of items) {
          const pid = this.toObjectId(item.productId, 'productId');

          const product = await this.productModel
            .findOne(
              { _id: pid, 'variants.sku': item.sku },
              { name: 1, images: 1, variants: 1 },
            )
            .session(session)
            .lean();

          if (!product) {
            throw new BadRequestException('Không tìm thấy sản phẩm/phiên bản');
          }

          const variant = (product.variants as any[])?.find(
            (v) => v.sku === item.sku,
          );
          if (!variant)
            throw new BadRequestException('Không tìm thấy phiên bản');

          const ok = await this.atomicDeductStock(
            pid,
            item.sku,
            item.quantity,
            session,
          );
          if (!ok)
            throw new BadRequestException(
              `Không đủ tồn kho cho SKU ${item.sku}`,
            );

          totalAmount += variant.price * item.quantity;

          orderItems.push({
            productId: pid,
            name: product.name,
            sku: item.sku,
            price: variant.price,
            quantity: item.quantity,
            imageUrl: (product.images as any[])?.[0]?.url,
          });
        }

        try {
          const created = await this.orderModel.create(
            [
              {
                userId: uid,
                items: orderItems,
                totalAmount,
                status: 'pending',
                idempotencyKey: key,
              },
            ],
            { session },
          );
          return created[0];
        } catch (e: any) {
          // duplicate idempotency race → fetch existing
          if (key && e?.code === 11000) {
            const existing = await this.orderModel
              .findOne({ userId: uid, idempotencyKey: key })
              .session(session)
              .lean();
            if (existing) return existing as any;
          }
          throw e;
        }
      });

      return result;
    } catch (txErr) {
      // === Fallback no-tx: best-effort rollback ===
      const deducted: Array<{
        productId: Types.ObjectId;
        sku: string;
        qty: number;
      }> = [];
      let totalAmount = 0;
      const orderItems: any[] = [];

      try {
        // re-check idempotency
        if (key) {
          const existing = await this.orderModel
            .findOne({ userId: uid, idempotencyKey: key })
            .lean();
          if (existing) return existing;
        }

        for (const item of items) {
          const pid = this.toObjectId(item.productId, 'productId');

          const product = await this.productModel
            .findOne(
              { _id: pid, 'variants.sku': item.sku },
              { name: 1, images: 1, variants: 1 },
            )
            .lean();

          if (!product)
            throw new BadRequestException('Không tìm thấy sản phẩm/phiên bản');

          const variant = (product.variants as any[])?.find(
            (v) => v.sku === item.sku,
          );
          if (!variant)
            throw new BadRequestException('Không tìm thấy phiên bản');

          const ok = await this.atomicDeductStock(pid, item.sku, item.quantity);
          if (!ok)
            throw new BadRequestException(
              `Không đủ tồn kho cho SKU ${item.sku}`,
            );

          deducted.push({ productId: pid, sku: item.sku, qty: item.quantity });

          totalAmount += variant.price * item.quantity;

          orderItems.push({
            productId: pid,
            name: product.name,
            sku: item.sku,
            price: variant.price,
            quantity: item.quantity,
            imageUrl: (product.images as any[])?.[0]?.url,
          });
        }

        try {
          return await this.orderModel.create({
            userId: uid,
            items: orderItems,
            totalAmount,
            status: 'pending',
            idempotencyKey: key,
          });
        } catch (e: any) {
          if (key && e?.code === 11000) {
            const existing = await this.orderModel
              .findOne({ userId: uid, idempotencyKey: key })
              .lean();
            if (existing) return existing;
          }
          throw e;
        }
      } catch (e) {
        await this.rollbackStock(deducted);
        throw e;
      }
    }
  }

  async cancelOrder(orderId: string, userId: string) {
    const oid = this.toObjectId(orderId, 'orderId');
    const uid = this.toObjectId(userId, 'userId');

    const order = await this.orderModel.findOne({ _id: oid, userId: uid });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Không thể hủy đơn hàng ở trạng thái hiện tại',
      );
    }

    // rollback stock (bulk)
    const ops = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId, 'variants.sku': item.sku },
        update: {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        },
      },
    }));
    if (ops.length) await this.productModel.bulkWrite(ops);

    order.status = 'cancelled';
    await order.save();
    return order;
  }

  async findAll(input: AdminFindAllInput) {
    const page = Math.max(1, input.page || 1);
    const limit = this.clampLimit(input.limit || 30, 100, 30);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (input.status) {
      this.ensureValidStatus(input.status);
      filter.status = input.status as any;
    }

    if (input.userId) {
      filter.userId = this.toObjectId(input.userId, 'userId');
    }

    const [total, data] = await Promise.all([
      this.orderModel.countDocuments(filter),
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findByUser(userId: string, input: UserFindInput) {
    const uid = this.toObjectId(userId, 'userId');

    const page = Math.max(1, input.page || 1);
    const limit = this.clampLimit(input.limit || 20, 50, 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { userId: uid };

    if (input.status) {
      this.ensureValidStatus(input.status);
      filter.status = input.status as any;
    }

    const [total, data] = await Promise.all([
      this.orderModel.countDocuments(filter),
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOneByUser(orderId: string, userId: string) {
    const oid = this.toObjectId(orderId, 'orderId');
    const uid = this.toObjectId(userId, 'userId');

    const order = await this.orderModel
      .findOne({ _id: oid, userId: uid })
      .lean();
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  /**
   * ADMIN: only cancel (pending -> cancelled). Paid is NOT allowed here.
   */
  async adminUpdateStatus(orderId: string, status: 'cancelled') {
    const oid = this.toObjectId(orderId, 'orderId');

    const order = await this.orderModel.findById(oid);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'pending') {
      throw new BadRequestException('Chỉ có thể cancel đơn hàng pending');
    }

    // rollback stock
    const ops = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId, 'variants.sku': item.sku },
        update: {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        },
      },
    }));
    if (ops.length) await this.productModel.bulkWrite(ops);

    order.status = 'cancelled';
    await order.save();
    return order;
  }

  /**
   * PAYMENT FLOW: mark paid idempotently.
   * - Nếu order đã paid => return luôn
   * - Chỉ cho pending -> paid
   */
  async markPaidFromPayment(
    orderId: string,
    opts: {
      paymentProvider?: string;
      paymentRef?: string;
      paymentMethod?: 'vnpay' | 'cod' | 'mock';
    },
  ) {
    const oid = this.toObjectId(orderId, 'orderId');

    const order = await this.orderModel.findById(oid);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status === 'paid') return order;

    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Không thể thanh toán đơn hàng ở trạng thái hiện tại',
      );
    }

    order.status = 'paid';
    order.paidAt = new Date();
    if (opts?.paymentProvider) order.paymentProvider = opts.paymentProvider;
    if (opts?.paymentRef) order.paymentRef = opts.paymentRef;
    if (opts?.paymentMethod) order.paymentMethod = opts.paymentMethod;

    await order.save();
    return order;
  }
}
