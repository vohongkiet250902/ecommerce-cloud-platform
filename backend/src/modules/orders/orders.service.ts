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
  // guardrails chống abuse / input bẩn
  private readonly MAX_ITEMS = 50;
  private readonly MAX_QTY_PER_ITEM = 999;

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

  private normalizeSku(sku: string) {
    const s = String(sku).trim();
    if (!s) throw new BadRequestException('sku không hợp lệ');
    return s;
  }

  private clampQty(qty: number) {
    if (!Number.isFinite(qty) || !Number.isInteger(qty)) {
      throw new BadRequestException('quantity phải là số nguyên');
    }
    if (qty < 1) throw new BadRequestException('quantity phải >= 1');
    if (qty > this.MAX_QTY_PER_ITEM) {
      throw new BadRequestException(`quantity tối đa ${this.MAX_QTY_PER_ITEM}`);
    }
    return qty;
  }

  /**
   * Chuẩn hoá + merge duplicates by (productId, sku)
   * Đồng thời validate cứng để OrdersService an toàn dù ai gọi.
   */
  private normalizeItems(items: CreateOrderItemDto[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Đơn hàng không có sản phẩm');
    }
    if (items.length > this.MAX_ITEMS) {
      throw new BadRequestException(`Tối đa ${this.MAX_ITEMS} sản phẩm`);
    }

    const map = new Map<string, CreateOrderItemDto>();

    for (const raw of items) {
      const pid = this.toObjectId(raw.productId, 'productId').toString();
      const sku = this.normalizeSku(raw.sku);
      const quantity = this.clampQty(raw.quantity);

      const key = `${pid}:${sku}`;
      const existing = map.get(key);
      if (existing) existing.quantity += quantity;
      else map.set(key, { productId: pid, sku, quantity });
    }

    const merged = Array.from(map.values());
    if (merged.length > this.MAX_ITEMS) {
      throw new BadRequestException(`Tối đa ${this.MAX_ITEMS} sản phẩm`);
    }

    // clamp lại sau merge (tránh cộng dồn vượt max)
    for (const it of merged) it.quantity = this.clampQty(it.quantity);

    return merged;
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

  /**
   * Internal: create order but also tell caller whether it was newly created.
   * (Cart checkout cần info này để không clear nhầm cart khi idempotency hit.)
   */
  async createWithMeta(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<{ order: any; isNew: boolean }> {
    const uid = this.toObjectId(userId, 'userId');
    const key = this.validateIdempotencyKey(idempotencyKey);

    // Fast-path idempotency (no tx)
    if (key) {
      const existing = await this.orderModel
        .findOne({ userId: uid, idempotencyKey: key })
        .lean();
      if (existing) return { order: existing, isNew: false };
    }

    const items = this.normalizeItems(dto.items);

    // ===== Transaction path =====
    try {
      const result = await this.tryWithTransaction(async (session) => {
        // race-safe re-check
        if (key) {
          const existing = await this.orderModel
            .findOne({ userId: uid, idempotencyKey: key })
            .session(session)
            .lean();
          if (existing) return { order: existing, isNew: false };
        }

        // preload products (giảm N+1)
        const pids = items.map((i) =>
          this.toObjectId(i.productId, 'productId'),
        );
        const uniqueIds = Array.from(
          new Set(pids.map((x) => x.toString())),
        ).map((x) => new Types.ObjectId(x));

        const products = await this.productModel
          .find(
            { _id: { $in: uniqueIds } },
            { name: 1, images: 1, variants: 1 },
          )
          .session(session)
          .lean();

        const productMap = new Map<string, any>();
        for (const p of products) productMap.set(p._id.toString(), p);

        let totalAmount = 0;
        const orderItems: any[] = [];

        for (const item of items) {
          const pid = this.toObjectId(item.productId, 'productId');
          const product = productMap.get(pid.toString());
          if (!product) {
            throw new BadRequestException('Không tìm thấy sản phẩm/phiên bản');
          }

          const variant = (product.variants as any[])?.find(
            (v) => v.sku === item.sku,
          );
          if (!variant) {
            throw new BadRequestException('Không tìm thấy sản phẩm/phiên bản');
          }

          const ok = await this.atomicDeductStock(
            pid,
            item.sku,
            item.quantity,
            session,
          );
          if (!ok) {
            throw new BadRequestException(
              `Không đủ tồn kho cho SKU ${item.sku}`,
            );
          }

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

          // created[0] là doc; trả lean-like để consistent
          return { order: created[0].toObject(), isNew: true };
        } catch (e: any) {
          // duplicate idempotency race → fetch existing
          if (key && e?.code === 11000) {
            const existing = await this.orderModel
              .findOne({ userId: uid, idempotencyKey: key })
              .session(session)
              .lean();
            if (existing) return { order: existing, isNew: false };
          }
          throw e;
        }
      });

      return result;
    } catch (txErr) {
      // ===== Fallback no-tx: best-effort rollback =====
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
          if (existing) return { order: existing, isNew: false };
        }

        // preload products (no tx)
        const pids = items.map((i) =>
          this.toObjectId(i.productId, 'productId'),
        );
        const uniqueIds = Array.from(
          new Set(pids.map((x) => x.toString())),
        ).map((x) => new Types.ObjectId(x));

        const products = await this.productModel
          .find(
            { _id: { $in: uniqueIds } },
            { name: 1, images: 1, variants: 1 },
          )
          .lean();

        const productMap = new Map<string, any>();
        for (const p of products) productMap.set(p._id.toString(), p);

        for (const item of items) {
          const pid = this.toObjectId(item.productId, 'productId');
          const product = productMap.get(pid.toString());
          if (!product) {
            throw new BadRequestException('Không tìm thấy sản phẩm/phiên bản');
          }

          const variant = (product.variants as any[])?.find(
            (v) => v.sku === item.sku,
          );
          if (!variant) {
            throw new BadRequestException('Không tìm thấy sản phẩm/phiên bản');
          }

          const ok = await this.atomicDeductStock(pid, item.sku, item.quantity);
          if (!ok) {
            throw new BadRequestException(
              `Không đủ tồn kho cho SKU ${item.sku}`,
            );
          }

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
          const created = await this.orderModel.create({
            userId: uid,
            items: orderItems,
            totalAmount,
            status: 'pending',
            idempotencyKey: key,
          });

          return { order: created.toObject(), isNew: true };
        } catch (e: any) {
          if (key && e?.code === 11000) {
            const existing = await this.orderModel
              .findOne({ userId: uid, idempotencyKey: key })
              .lean();
            if (existing) return { order: existing, isNew: false };
          }
          throw e;
        }
      } catch (e) {
        await this.rollbackStock(deducted);
        throw e;
      }
    }
  }

  /**
   * Public API: giữ nguyên behavior cũ (controllers không cần đổi)
   */
  async create(userId: string, dto: CreateOrderDto, idempotencyKey?: string) {
    const { order } = await this.createWithMeta(userId, dto, idempotencyKey);
    return order;
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
    return order.toObject();
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
    return order.toObject();
  }

  /**
   * PAYMENT FLOW: mark paid idempotently.
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

    if (order.status === 'paid') return order.toObject();

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
    return order.toObject();
  }
}
