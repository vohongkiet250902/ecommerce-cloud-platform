import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';

type StatusUpdatePayload = {
  status: OrderStatus;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly couponsService: CouponsService,
    private readonly inventoryService: InventoryService,
  ) {}

  private getSellPrice(variant: any) {
    if (typeof variant.finalPrice === 'number' && variant.finalPrice > 0) {
      return variant.finalPrice;
    }
    return Number(variant.price ?? 0);
  }

  private getInitialPaymentStatus(paymentMethod: PaymentMethod): PaymentStatus {
    if (paymentMethod === 'vnpay') return 'pending';
    return 'unpaid';
  }

  private getExpireAt(paymentMethod: PaymentMethod) {
    if (paymentMethod !== 'vnpay') return undefined;
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d;
  }

  private assertCanSell(product: Product, variant: any, sku: string) {
    if (product.status !== 'active') {
      throw new BadRequestException(`Sản phẩm đang inactive (SKU: ${sku})`);
    }
    if (variant.status && variant.status !== 'active') {
      throw new BadRequestException(`Variant đang inactive (SKU: ${sku})`);
    }
  }

  private assertTransition(current: OrderStatus, next: OrderStatus) {
    const map: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipping', 'cancelled'],
      shipping: ['delivered'],
      delivered: ['completed'],
      completed: [],
      cancelled: [],
    };

    if (!map[current].includes(next)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${current} sang ${next}`,
      );
    }
  }

  async create(userId: string, dto: any) {
    const paymentMethod: PaymentMethod = dto.paymentMethod || 'cod';
    const normalizedIdempotencyKey = dto.idempotencyKey?.trim();

    if (normalizedIdempotencyKey) {
      const existingOrder = await this.orderModel.findOne({
        userId: new Types.ObjectId(userId),
        idempotencyKey: normalizedIdempotencyKey,
      });

      if (existingOrder) return existingOrder;
    }

    const session = await this.orderModel.db.startSession();

    try {
      let createdOrder: Order | null = null;

      await session.withTransaction(async () => {
        let subTotal = 0;
        const orderItems: any[] = [];

        for (const item of dto.items) {
          const product = await this.productModel
            .findOne({
              _id: new Types.ObjectId(item.productId),
              'variants.sku': item.sku,
            })
            .session(session);

          if (!product) {
            throw new BadRequestException(
              `Sản phẩm không tồn tại (SKU: ${item.sku})`,
            );
          }

          const variant = product.variants.find((v) => v.sku === item.sku);
          if (!variant) {
            throw new BadRequestException(
              `Phiên bản không tồn tại (SKU: ${item.sku})`,
            );
          }

          this.assertCanSell(product, variant, item.sku);

          const sellPrice = this.getSellPrice(variant);

          const allocationResult = await this.inventoryService.allocateFifo(
            String(product._id),
            item.sku,
            item.quantity,
            session,
          );

          const lineTotal = sellPrice * item.quantity;
          const averageUnitCost =
            item.quantity > 0
              ? Math.round(allocationResult.totalCost / item.quantity)
              : 0;

          orderItems.push({
            productId: product._id,
            name: product.name,
            sku: item.sku,
            price: sellPrice,
            quantity: item.quantity,
            lineTotal,
            unitCostSnapshot: averageUnitCost,
            lotAllocations: allocationResult.allocations,
            imageUrl: product.images?.[0]?.url,
          });

          subTotal += lineTotal;
        }

        if (orderItems.length === 0) {
          throw new BadRequestException('Đơn hàng rỗng');
        }

        let finalTotal = subTotal;
        let discountAmount = 0;

        if (dto.couponCode) {
          const discountResult = await this.couponsService.calculateDiscount({
            code: dto.couponCode,
            orderTotal: subTotal,
          });

          finalTotal = discountResult.finalTotal;
          discountAmount = discountResult.discountAmount;
        }

        const docs = await this.orderModel.create(
          [
            {
              userId: new Types.ObjectId(userId),
              items: orderItems,
              shippingInfo: dto.shippingInfo,
              totalAmount: finalTotal,
              couponCode: dto.couponCode,
              discountAmount,
              paymentMethod,
              paymentStatus: this.getInitialPaymentStatus(paymentMethod),
              status: 'pending',
              idempotencyKey: normalizedIdempotencyKey,
              placedAt: new Date(),
              expiresAt: this.getExpireAt(paymentMethod),
            },
          ],
          { session },
        );

        createdOrder = docs[0];
      });

      return createdOrder;
    } catch (error: any) {
      if (error?.code === 11000 && normalizedIdempotencyKey) {
        const existingOrder = await this.orderModel.findOne({
          userId: new Types.ObjectId(userId),
          idempotencyKey: normalizedIdempotencyKey,
        });
        if (existingOrder) return existingOrder;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async hasPurchased(
    userId: string,
    productId: string,
    sku: string,
  ): Promise<boolean> {
    const order = await this.orderModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'completed',
      items: {
        $elemMatch: {
          productId: new Types.ObjectId(productId),
          sku,
        },
      },
    });
    return !!order;
  }

  async findAll(query: {
    page: number;
    limit: number;
    status?: string;
    userId?: string;
  }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.userId && Types.ObjectId.isValid(query.userId)) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit),
      this.orderModel.countDocuments(filter),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  private async releaseOrderStock(order: Order, session: any) {
    for (const item of order.items) {
      await this.inventoryService.releaseAllocations(
        String(item.productId),
        item.sku,
        item.lotAllocations || [],
        session,
      );
    }
  }

  private applyTransitionSideEffects(order: Order, nextStatus: OrderStatus) {
    const now = new Date();

    if (nextStatus === 'confirmed') {
      order.confirmedAt = order.confirmedAt || now;
    }

    if (nextStatus === 'shipping') {
      order.shippedAt = now;
    }

    if (nextStatus === 'delivered') {
      order.deliveredAt = now;

      if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paidAt = now;
      }
    }

    if (nextStatus === 'completed') {
      order.completedAt = now;
    }

    if (nextStatus === 'cancelled') {
      order.cancelledAt = now;
    }
  }

  async updateStatus(orderId: string, updateData: StatusUpdatePayload) {
    if (!updateData?.status) {
      throw new BadRequestException('Thiếu status');
    }

    const session = await this.orderModel.db.startSession();

    try {
      let updatedOrder: Order | null = null;

      await session.withTransaction(async () => {
        const order = await this.orderModel.findById(orderId).session(session);
        if (!order) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        this.assertTransition(order.status, updateData.status);

        if (
          updateData.status === 'confirmed' &&
          order.paymentMethod === 'vnpay' &&
          order.paymentStatus !== 'paid'
        ) {
          throw new BadRequestException(
            'Đơn VNPay chỉ được xác nhận sau khi đã thanh toán',
          );
        }

        if (updateData.status === 'cancelled') {
          await this.releaseOrderStock(order, session);
        }

        this.applyTransitionSideEffects(order, updateData.status);
        order.status = updateData.status;

        await order.save({ session });
        updatedOrder = order;
      });

      return updatedOrder;
    } finally {
      await session.endSession();
    }
  }

  async adminCancelOrder(orderId: string) {
    return this.updateStatus(orderId, { status: 'cancelled' });
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng đang chờ xử lý hoặc đã xác nhận',
      );
    }

    if (order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid') {
      throw new BadRequestException(
        'Đơn đã thanh toán online, admin cần xử lý hoàn tiền trước khi hủy',
      );
    }

    return this.updateStatus(orderId, { status: 'cancelled' });
  }

  async findByUser(
    userId: string,
    query?: { page: number; limit: number; status?: string },
  ) {
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (query?.status) {
      filter.status = query.status;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOneByUser(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }

  async confirmVnpayPayment(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status === 'cancelled') {
      throw new BadRequestException('Đơn hàng đã bị hủy');
    }

    if (order.paymentStatus === 'paid') {
      return order;
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date();

    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.confirmedAt = order.confirmedAt || new Date();
    }

    await order.save();
    return order;
  }

  async handlePaymentFailed(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (
      order.status === 'cancelled' ||
      order.status === 'completed' ||
      order.paymentStatus === 'paid'
    ) {
      return order;
    }

    order.paymentStatus = 'failed';
    await order.save();

    return order;
  }

  async retryPayment(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.paymentMethod !== 'vnpay') {
      throw new BadRequestException(
        'Đơn hàng này không sử dụng phương thức thanh toán VNPay',
      );
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException(
        'Không thể thanh toán lại đơn hàng đã kết thúc',
      );
    }

    if (!['pending', 'failed'].includes(order.paymentStatus)) {
      throw new BadRequestException(
        'Chỉ có thể thanh toán lại đơn hàng chưa thanh toán xong',
      );
    }

    order.paymentStatus = 'pending';
    order.expiresAt = this.getExpireAt('vnpay');
    await order.save();

    return order;
  }

  async getProductsSoldByDay(days = 7) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    return this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'completed'] },
          $or: [
            { deliveredAt: { $gte: start } },
            { completedAt: { $gte: start } },
          ],
        },
      },
      {
        $addFields: {
          soldAt: {
            $ifNull: ['$completedAt', '$deliveredAt'],
          },
        },
      },
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$soldAt',
                timezone: 'Asia/Ho_Chi_Minh',
              },
            },
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
        },
      },
      {
        $sort: { day: 1 },
      },
    ]);
  }
}
