import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './schemas/order.schema';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
import { OrdersShippingService } from './orders-shipping.service';
import { CreateOrderDto, PreviewOrderDto } from './dto/create-order.dto';

const GHN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'delivery_failed', 'returned', 'cancelled'],
  delivered: ['completed'],
  delivery_failed: ['shipping', 'returned', 'cancelled'],
  completed: [],
  returned: [],
  cancelled: [],
};

const ADMIN_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  shipping: ['cancelled'],
  delivery_failed: ['cancelled'],
  delivered: ['completed'],
  completed: [],
  returned: [],
  cancelled: [],
};

const USER_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['cancelled'],
  confirmed: ['cancelled'],
  shipping: ['completed'],
  delivered: ['completed', 'delivery_failed', 'returned'],
  completed: ['returned'],
  delivery_failed: [],
  returned: [],
  cancelled: [],
};

type StatusUpdatePayload = { status: OrderStatus };
type TransitionSource = 'ghn' | 'admin' | 'system' | 'user';
type OrderDocument = HydratedDocument<Order>;

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly productsService: ProductsService,
    private readonly couponsService: CouponsService,
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    @Inject(forwardRef(() => OrdersShippingService))
    private readonly shippingService: OrdersShippingService,
  ) {}

  private getSellPrice(variant: any) {
    return typeof variant.finalPrice === 'number' && variant.finalPrice > 0
      ? variant.finalPrice
      : Number(variant.price ?? 0);
  }

  private getInitialPaymentStatus(paymentMethod: PaymentMethod): PaymentStatus {
    return paymentMethod === 'vnpay' ? 'pending' : 'unpaid';
  }

  private getExpireAt(paymentMethod: PaymentMethod) {
    if (paymentMethod !== 'vnpay') return undefined;
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d;
  }

  private assertCanSell(product: any, variant: any, sku: string) {
    if (product.status !== 'active')
      throw new BadRequestException(`Sản phẩm đang inactive (SKU: ${sku})`);
    if (variant.status && variant.status !== 'active')
      throw new BadRequestException(`Variant đang inactive (SKU: ${sku})`);
  }

  private assertTransition(
    current: OrderStatus,
    next: OrderStatus,
    source: TransitionSource | 'user' = 'ghn',
  ) {
    const map =
      source === 'admin'
        ? ADMIN_ALLOWED_TRANSITIONS
        : source === 'user'
          ? USER_ALLOWED_TRANSITIONS
          : GHN_TRANSITIONS;
    if (!map[current]?.includes(next)) {
      const hint =
        source === 'admin'
          ? 'Admin chỉ được cancel hoặc xác nhận hoàn thành thủ công.'
          : `Không thể chuyển trạng thái từ "${current}" sang "${next}"`;
      throw new BadRequestException(hint);
    }
  }

  private isDuplicateNullIdempotencyError(error: any) {
    return (
      error?.code === 11000 &&
      String(error?.message || '').includes('idempotencyKey') &&
      String(error?.message || '').includes('null')
    );
  }

  private throwReadableOrderError(error: any, sku?: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    )
      throw error;
    const msg = error?.message || 'Tạo đơn hàng thất bại do lỗi không xác định';
    throw new BadRequestException(
      sku ? `Không thể allocate FIFO cho SKU ${sku}: ${msg}` : msg,
    );
  }

  private applyTransitionSideEffects(order: any, nextStatus: OrderStatus) {
    const now = new Date();
    if (nextStatus === 'confirmed')
      order.confirmedAt = order.confirmedAt || now;
    if (nextStatus === 'shipping') order.shippedAt = now;
    if (nextStatus === 'delivered') {
      order.deliveredAt = now;
      if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paidAt = now;
      }
    }
    if (nextStatus === 'completed') order.completedAt = now;
    if (nextStatus === 'cancelled') order.cancelledAt = now;
    if (nextStatus === 'delivery_failed') order.deliveryFailedAt = now;
    if (nextStatus === 'returned') order.returnedAt = now;
  }

  private async performStatusUpdate(
    orderId: string,
    updateData: StatusUpdatePayload,
    source: TransitionSource | 'user',
    session?: any,
  ) {
    const query = this.orderModel.findById(orderId);
    if (session) query.session(session);
    const order = await query;
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    this.assertTransition(order.status, updateData.status, source);
    if (
      updateData.status === 'confirmed' &&
      order.paymentMethod === 'vnpay' &&
      order.paymentStatus !== 'paid'
    ) {
      throw new BadRequestException(
        'Đơn VNPay chỉ được xác nhận sau khi đã thanh toán',
      );
    }

    if (['cancelled', 'returned'].includes(updateData.status)) {
      await this.releaseOrderStock(order, session);
    }

    this.applyTransitionSideEffects(order, updateData.status);
    order.status = updateData.status;
    if (session) await order.save({ session });
    else await order.save();
    return order;
  }

  async updateStatus(
    orderId: string,
    updateData: StatusUpdatePayload,
    source: TransitionSource = 'ghn',
  ): Promise<OrderDocument | null> {
    if (!updateData?.status) throw new BadRequestException('Thiếu status');
    const session = await this.orderModel.db.startSession();
    try {
      let updatedOrder: OrderDocument | null = null;
      await session.withTransaction(async () => {
        updatedOrder = await this.performStatusUpdate(
          orderId,
          updateData,
          source,
          session,
        );
      });
      return updatedOrder;
    } finally {
      await session.endSession();
    }
  }

  private async buildOrderDocument(
    userId: string,
    dto: CreateOrderDto,
    paymentMethod: PaymentMethod,
    normalizedIdempotencyKey?: string,
    session?: any,
  ) {
    let subTotal = 0;
    const orderItems: any[] = [];
    for (const item of dto.items) {
      const data = await this.productsService.findVariantForOrder(
        item.productId,
        item.sku,
        session,
      );
      if (!data)
        throw new BadRequestException(
          `Sản phẩm không tồn tại (SKU: ${item.sku})`,
        );
      const { product, variant } = data;

      this.assertCanSell(product, variant, item.sku);
      const sellPrice = this.getSellPrice(variant);

      let allocationResult: any;
      try {
        allocationResult = await this.inventoryService.allocateFifo(
          String((product as any)._id),
          item.sku,
          item.quantity,
          session,
        );
      } catch (error: any) {
        this.throwReadableOrderError(error, item.sku);
      }

      if (!allocationResult || !Array.isArray(allocationResult.allocations))
        throw new BadRequestException(
          `Inventory allocate trả về lỗi (SKU: ${item.sku})`,
        );

      const lineTotal = sellPrice * item.quantity;
      const averageUnitCost =
        item.quantity > 0
          ? Math.round(Number(allocationResult.totalCost || 0) / item.quantity)
          : 0;

      orderItems.push({
        productId: (product as any)._id,
        name: (product as any).name,
        sku: item.sku,
        price: sellPrice,
        quantity: item.quantity,
        lineTotal,
        unitCostSnapshot: averageUnitCost,
        lotAllocations: allocationResult.allocations,
        imageUrl: variant.image?.url || (product as any).images?.[0]?.url,
        attributes: variant.attributes || variant.val,
      });
      subTotal += lineTotal;
    }

    if (orderItems.length === 0) throw new BadRequestException('Đơn hàng rỗng');

    let discountAmount = 0;
    let finalTotal = subTotal;
    if (dto.couponCode) {
      try {
        const discountResult = await this.couponsService.calculateDiscount({
          code: dto.couponCode,
          orderTotal: subTotal,
        });
        discountAmount = Math.min(discountResult.discountAmount, subTotal);
        if (session)
          await this.couponsService.consumeCoupon(dto.couponCode, session);
      } catch (error: any) {
        this.throwReadableOrderError(error);
      }
    }

    let expectedShippingFee = 0;
    if (
      dto.shippingInfo?.ghnDistrictId &&
      dto.shippingInfo?.ghnWardCode &&
      this.shippingService
    ) {
      expectedShippingFee =
        await this.shippingService.calculateExpectedShippingFee(
          orderItems,
          dto.shippingInfo.ghnDistrictId,
          dto.shippingInfo.ghnWardCode,
          subTotal,
        );
    }
    finalTotal = Math.max(0, subTotal + expectedShippingFee - discountAmount);

    const payload: any = {
      userId: new Types.ObjectId(userId),
      items: orderItems,
      shippingInfo: dto.shippingInfo,
      shipping: {
        provider: 'ghn',
        env: 'production',
        syncStatus: 'not_created',
        fee: expectedShippingFee,
        codAmount: paymentMethod === 'cod' ? finalTotal : 0,
        statusHistory: [],
      },
      totalAmount: finalTotal,
      couponCode: dto.couponCode,
      discountAmount,
      paymentMethod,
      paymentStatus: this.getInitialPaymentStatus(paymentMethod),
      status: 'pending' as OrderStatus,
      placedAt: new Date(),
      expiresAt: this.getExpireAt(paymentMethod),
    };
    if (normalizedIdempotencyKey)
      payload.idempotencyKey = normalizedIdempotencyKey;

    const docs = session
      ? await this.orderModel.create([payload], { session })
      : await this.orderModel.create([payload]);
    return docs[0];
  }

  async create(userId: string, dto: CreateOrderDto) {
    const paymentMethod: PaymentMethod =
      (dto.paymentMethod as PaymentMethod) || 'cod';
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
      let createdOrder: OrderDocument | null = null;
      await session.withTransaction(async () => {
        createdOrder = await this.buildOrderDocument(
          userId,
          dto,
          paymentMethod,
          normalizedIdempotencyKey,
          session,
        );
      });
      if (!createdOrder)
        throw new BadRequestException('Không thể tạo đơn hàng');
      const fresh = await this.orderModel
        .findById((createdOrder as any)._id)
        .lean();
      return fresh || createdOrder;
    } catch (error: any) {
      if (error?.code === 11000 && normalizedIdempotencyKey) {
        const existingOrder = await this.orderModel.findOne({
          userId: new Types.ObjectId(userId),
          idempotencyKey: normalizedIdempotencyKey,
        });
        if (existingOrder) return existingOrder;
      }
      if (this.isDuplicateNullIdempotencyError(error))
        throw new BadRequestException('DB lỗi unique index null');
      this.throwReadableOrderError(error);
    } finally {
      await session.endSession();
    }
  }

  async previewOrder(dto: PreviewOrderDto) {
    let subTotal = 0;
    const previewItems: any[] = [];
    for (const item of dto.items) {
      const data = await this.productsService.findVariantForOrder(
        item.productId,
        item.sku,
      );
      if (!data)
        throw new BadRequestException(
          `Sản phẩm không tồn tại (SKU: ${item.sku})`,
        );
      this.assertCanSell(data.product, data.variant, item.sku);
      const sellPrice = this.getSellPrice(data.variant);
      const lineTotal = sellPrice * item.quantity;
      previewItems.push({
        productId: data.product._id,
        name: (data.product as any).name,
        sku: item.sku,
        price: sellPrice,
        quantity: item.quantity,
        lineTotal,
      });
      subTotal += lineTotal;
    }

    let shippingFee = 0;
    let discountAmount = 0;
    let couponDetails: any = null;
    if (dto.ghnDistrictId && dto.ghnWardCode && this.shippingService) {
      shippingFee = await this.shippingService.calculateExpectedShippingFee(
        previewItems,
        dto.ghnDistrictId,
        dto.ghnWardCode,
        subTotal,
      );
    }

    if (dto.couponCode) {
      try {
        const discountResult = await this.couponsService.calculateDiscount({
          code: dto.couponCode,
          orderTotal: subTotal,
        });
        discountAmount = Math.min(discountResult.discountAmount, subTotal);
        couponDetails = {
          code: discountResult.couponCode,
          discountPercentage: discountResult.discountPercentage,
        };
      } catch (error: any) {
        throw new BadRequestException(error.message);
      }
    }
    const finalTotal = Math.max(0, subTotal + shippingFee - discountAmount);
    return {
      items: previewItems,
      pricing: { subTotal, shippingFee, discountAmount, finalTotal },
      coupon: couponDetails,
    };
  }

  async findAll(query: {
    page: number;
    limit: number;
    status?: string;
    userId?: string;
  }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.userId && Types.ObjectId.isValid(query.userId))
      filter.userId = new Types.ObjectId(query.userId);

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  }

  async findByUser(
    userId: string,
    query?: { page: number; limit: number; status?: string },
  ) {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (query?.status) filter.status = query.status;
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findOneByUser(orderId: string, userId: string) {
    const order = await this.orderModel
      .findOne({ _id: orderId, userId: new Types.ObjectId(userId) })
      .lean();
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }

  async hasPurchased(
    userId: string,
    productId: string,
    sku: string,
  ): Promise<boolean> {
    const order = await this.orderModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: 'completed',
        items: {
          $elemMatch: { productId: new Types.ObjectId(productId), sku },
        },
      })
      .lean();
    return !!order;
  }

  private async releaseOrderStock(order: Order, session?: any) {
    for (const item of order.items) {
      await this.inventoryService.releaseAllocations(
        String(item.productId),
        item.sku,
        item.lotAllocations || [],
        session,
      );
    }
  }

  // --- Hành động của User ---
  async userCancelOrder(orderId: string, userId: string) {
    return this.updateStatus(orderId, { status: 'cancelled' }, 'user');
  }
  async confirmReceived(orderId: string, userId: string) {
    return this.updateStatus(orderId, { status: 'completed' }, 'user');
  }
  async reportNotReceived(orderId: string, userId: string) {
    return this.updateStatus(orderId, { status: 'delivery_failed' }, 'user');
  }
  async returnOrder(orderId: string, userId: string) {
    return this.updateStatus(orderId, { status: 'returned' }, 'user');
  }

  // --- Hành động của Admin ---
  async adminCancelOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (['completed', 'cancelled', 'returned'].includes(order.status)) {
      throw new BadRequestException('Đơn hàng đã kết thúc, không thể hủy');
    }

    // 1. Thực hiện các External Calls (VNPay, GHN) TRƯỚC KHI mở Transaction
    let isRefunded = false;
    if (order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid') {
      const refundResult = await this.paymentsService.refundTransaction(
        order,
        'admin',
      );
      if (!refundResult.success) {
        throw new BadRequestException(
          `Hoàn tiền VNPay thất bại: ${refundResult.message}`,
        );
      }
      isRefunded = true;
    }

    if (this.shippingService) {
      // Hàm này bản thân nó cập nhật riêng log của GHN, không ảnh hưởng trạng thái core
      await this.shippingService.cancelExternalShipmentIfNeeded(order);
    }

    // 2. Gom toàn bộ thay đổi Core Data vào 1 Session duy nhất
    const session = await this.orderModel.db.startSession();
    try {
      let updatedOrder: OrderDocument | null = null;
      await session.withTransaction(async () => {
        // Hàm performStatusUpdate đã bao gồm logic nhả tồn kho (inventory)
        updatedOrder = await this.performStatusUpdate(
          orderId,
          { status: 'cancelled' },
          'admin',
          session,
        );

        // Nếu đã hoàn tiền thành công, cập nhật paymentStatus cùng trong transaction này
        if (isRefunded && updatedOrder) {
          updatedOrder.paymentStatus = 'refunded';
          await updatedOrder.save({ session });
        }
      });
      return updatedOrder;
    } finally {
      await session.endSession();
    }
  }

  async adminCompleteOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status !== 'delivered')
      throw new BadRequestException(
        'Chỉ có thể hoàn thành đơn hàng đang ở trạng thái "delivered"',
      );
    return this.updateStatus(orderId, { status: 'completed' }, 'admin');
  }

  async adminConfirmOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status !== 'pending')
      throw new BadRequestException(
        'Chỉ có thể xác nhận đơn hàng đang ở trạng thái "pending"',
      );
    return this.updateStatus(orderId, { status: 'confirmed' }, 'admin');
  }

  // --- System/Payments Callbacks ---
  async confirmVnpayPayment(orderId: string, vnpayTransactionDate?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status === 'cancelled')
      throw new BadRequestException('Đơn hàng đã bị hủy');
    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      if (vnpayTransactionDate)
        order.vnpayTransactionDate = vnpayTransactionDate;
      await order.save();
    }
    return this.orderModel.findById(orderId);
  }

  async handlePaymentFailed(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (
      order.status === 'cancelled' ||
      order.status === 'completed' ||
      order.paymentStatus === 'paid'
    )
      return order;
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
    if (order.paymentMethod !== 'vnpay')
      throw new BadRequestException('Không sử dụng VNPay');
    if (['cancelled', 'completed', 'returned'].includes(order.status))
      throw new BadRequestException('Đơn hàng đã kết thúc');
    if (!['pending', 'failed'].includes(order.paymentStatus))
      throw new BadRequestException(
        'Chỉ cho phép thanh toán lại đơn chưa thanh toán xong',
      );
    order.paymentStatus = 'pending';
    order.expiresAt = this.getExpireAt('vnpay');
    await order.save();
    return order;
  }
}
