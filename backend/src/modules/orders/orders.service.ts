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
import { Product } from '../products/schemas/product.schema';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { GhnService } from '../ghn/ghn.service';
import { PaymentsService } from '../payments/payments.service';

// ─────────────────────────────────────────────────────────────
//  Transition maps
// ─────────────────────────────────────────────────────────────

/**
 * Các chuyển trạng thái hợp lệ khi đi qua luồng GHN
 * (webhook / simulate / sync). Admin KHÔNG được gọi trực tiếp.
 */
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

/**
 * Các chuyển trạng thái admin được phép thực hiện thủ công.
 * Chỉ cho phép cancel và completed (xác nhận hoàn thành khi
 * shipper không tích hợp webhook).
 */
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

type StatusUpdatePayload = {
  status: OrderStatus;
};

/** Nguồn gọi chuyển trạng thái — để enforce đúng transition map */
type TransitionSource = 'ghn' | 'admin' | 'system' | 'user';

type StatsGroupBy = 'day' | 'week' | 'month' | 'quarter';

type StatsRangeInput = {
  days?: number;
  weeks?: number;
  months?: number;
  quarters?: number;
};

type TopSortBy = 'quantity' | 'revenue' | 'profit';

type OrderDocument = HydratedDocument<Order>;

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly couponsService: CouponsService,
    private readonly inventoryService: InventoryService,
    private readonly ghnService: GhnService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  //  Private helpers
  // ─────────────────────────────────────────────────────────────

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
    if ((product as any).status !== 'active') {
      throw new BadRequestException(`Sản phẩm đang inactive (SKU: ${sku})`);
    }
    if (variant.status && variant.status !== 'active') {
      throw new BadRequestException(`Variant đang inactive (SKU: ${sku})`);
    }
  }

  /**
   * Kiểm tra chuyển trạng thái hợp lệ theo nguồn gọi.
   *
   * - 'ghn'    → dùng GHN_TRANSITIONS (đầy đủ shipping flow)
   * - 'admin'  → dùng ADMIN_ALLOWED_TRANSITIONS (chỉ cancel + một số edge case)
   * - 'system' → dùng GHN_TRANSITIONS (payment callback, auto-complete...)
   */
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
          ? 'Admin chỉ được cancel hoặc xác nhận hoàn thành thủ công. Hãy dùng simulate GHN để thay đổi trạng thái vận chuyển.'
          : `Không thể chuyển trạng thái từ "${current}" sang "${next}"`;
      throw new BadRequestException(hint);
    }
  }

  private ensureShipping(order: any) {
    if (!order.shipping) {
      order.shipping = {
        provider: 'ghn',
        env: this.ghnService.getEnv(),
        syncStatus: 'not_created',
        statusHistory: [],
      };
    }
    if (!order.shipping.statusHistory) {
      order.shipping.statusHistory = [];
    }
    return order.shipping;
  }

  private pushShippingHistory(
    order: any,
    status: string,
    note?: string,
    raw?: any,
  ) {
    const shipping = this.ensureShipping(order);
    const current = shipping.statusHistory || [];
    const last = current[current.length - 1];
    if (last?.status === status) return;
    current.push({ status, note, at: new Date(), raw });
    shipping.statusHistory = current;
  }

  private getReceiverAddress(shippingInfo: any) {
    return [
      shippingInfo.street,
      shippingInfo.ward,
      shippingInfo.district,
      shippingInfo.city,
    ]
      .filter(Boolean)
      .join(', ')
      .slice(0, 1024);
  }

  private buildParcelSnapshot(order: any) {
    const defaults = this.ghnService.getDefaultParcel();
    const totalQty = Math.max(
      1,
      (order.items || []).reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0,
      ),
    );
    return {
      weight: Math.min(30000, defaults.weight * totalQty),
      length: defaults.length,
      width: defaults.width,
      height: Math.min(150, defaults.height + Math.max(0, totalQty - 1)),
    };
  }

  private chooseBestGhnService(services: any[]) {
    if (!Array.isArray(services) || services.length === 0) {
      throw new BadRequestException('GHN không trả về service khả dụng');
    }
    return (
      services.find((s) => Number(s?.service_type_id) === 2) ||
      services.find((s) => Number(s?.service_id) > 0) ||
      services[0]
    );
  }

  private normalizeGhnStatus(status?: any): string | undefined {
    const normalized = String(status ?? '')
      .trim()
      .toLowerCase();
    return normalized || undefined;
  }

  private mapGhnStatusToOrderStatus(status?: string): OrderStatus | null {
    const s = this.normalizeGhnStatus(status);
    if (!s) return null;

    if (['ready_to_pick', 'picking', 'money_collect_picking'].includes(s)) {
      return 'confirmed';
    }
    if (
      [
        'picked',
        'storing',
        'transporting',
        'sorting',
        'delivering',
        'money_collect_delivering',
      ].includes(s)
    ) {
      return 'shipping';
    }
    if (
      [
        'delivery_fail',
        'waiting_to_return',
        'return',
        'return_transporting',
        'return_sorting',
        'returning',
        'return_fail',
        'exception',
        'damage',
        'lost',
      ].includes(s)
    ) {
      return 'delivery_failed';
    }
    if (s === 'delivered') return 'delivered';
    if (s === 'returned') return 'returned';
    if (s === 'cancel') return 'cancelled';
    return null;
  }

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

  private normalizeErrorMessage(error: any) {
    const responseMessage = error?.response?.message;
    if (Array.isArray(responseMessage)) return responseMessage.join(', ');
    if (typeof responseMessage === 'string' && responseMessage.trim())
      return responseMessage;
    if (typeof error?.message === 'string' && error.message.trim())
      return error.message;
    return 'Tạo đơn hàng thất bại do lỗi không xác định';
  }

  private isDuplicateNullIdempotencyError(error: any) {
    const msg = String(error?.message || '');
    return (
      error?.code === 11000 &&
      msg.includes('idempotencyKey') &&
      msg.includes('null')
    );
  }

  private throwReadableOrderError(error: any, sku?: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    const rawMessage = this.normalizeErrorMessage(error);
    if (sku) {
      throw new BadRequestException(
        `Không thể allocate FIFO cho SKU ${sku}: ${rawMessage}`,
      );
    }
    throw new BadRequestException(rawMessage);
  }

  private async buildOrderDocument(
    userId: string,
    dto: any,
    paymentMethod: PaymentMethod,
    normalizedIdempotencyKey?: string,
    session?: any,
  ) {
    let subTotal = 0;
    const orderItems: any[] = [];

    for (const item of dto.items) {
      const query = this.productModel.findOne({
        _id: new Types.ObjectId(item.productId),
        'variants.sku': item.sku,
      });
      if (session) query.session(session);
      const product = await query;

      if (!product) {
        throw new BadRequestException(
          `Sản phẩm không tồn tại (SKU: ${item.sku})`,
        );
      }

      const variant = (product as any).variants.find(
        (v: any) => v.sku === item.sku,
      );
      if (!variant) {
        throw new BadRequestException(
          `Phiên bản không tồn tại (SKU: ${item.sku})`,
        );
      }

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

      if (!allocationResult || !Array.isArray(allocationResult.allocations)) {
        throw new BadRequestException(
          `Inventory allocateFifo trả về dữ liệu không hợp lệ (SKU: ${item.sku})`,
        );
      }

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

    if (orderItems.length === 0) {
      throw new BadRequestException('Đơn hàng rỗng');
    }

    let discountAmount = 0;
    let finalTotal = subTotal;

    // 🔥 1. Tính mã giảm giá (Sanity check + Consume)
    if (dto.couponCode) {
      try {
        const discountResult = await this.couponsService.calculateDiscount({
          code: dto.couponCode,
          orderTotal: subTotal,
        });

        if (
          typeof discountResult.discountAmount !== 'number' ||
          discountResult.discountAmount < 0
        ) {
          throw new BadRequestException(
            'Hệ thống tính toán giảm giá gặp sự cố.',
          );
        }

        discountAmount = Math.min(discountResult.discountAmount, subTotal);

        if (session) {
          await this.couponsService.consumeCoupon(dto.couponCode, session);
        }
      } catch (error: any) {
        this.throwReadableOrderError(error);
      }
    }

    // 🔥 2. Tính phí ship tự động lưu vào Database
    let expectedShippingFee = 0;
    if (dto.shippingInfo?.ghnDistrictId && dto.shippingInfo?.ghnWardCode) {
      expectedShippingFee = await this.calculateExpectedShippingFee(
        orderItems,
        dto.shippingInfo.ghnDistrictId,
        dto.shippingInfo.ghnWardCode,
        subTotal,
      );
    }

    // 🔥 3. Chốt tổng thanh toán
    finalTotal = Math.max(0, subTotal + expectedShippingFee - discountAmount);

    const payload: any = {
      userId: new Types.ObjectId(userId),
      items: orderItems,
      shippingInfo: dto.shippingInfo,
      // 🔥 Khởi tạo sẵn object shipping để lưu phí vận chuyển
      shipping: {
        provider: 'ghn',
        env: this.ghnService.getEnv(),
        syncStatus: 'not_created',
        fee: expectedShippingFee, // LƯU PHÍ SHIP VÀO ĐÂY
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

    if (normalizedIdempotencyKey) {
      payload.idempotencyKey = normalizedIdempotencyKey;
    }

    const docs = session
      ? await this.orderModel.create([payload], { session })
      : await this.orderModel.create([payload]);

    return docs[0];
  }

  /**
   * Helper: Tính phí ship GHN dự kiến
   */
  private async calculateExpectedShippingFee(
    items: any[],
    ghnDistrictId: number,
    ghnWardCode: string,
    orderSubTotal: number,
  ): Promise<number> {
    try {
      if (!this.ghnService.hasConfig()) return 0;

      const fromCfg = this.ghnService.getFromConfig();
      const parcel = this.buildParcelSnapshot({ items });

      const services = await this.ghnService.getAvailableServices(
        ghnDistrictId,
        fromCfg.districtId,
      );
      const service = this.chooseBestGhnService(services);

      const feeData = await this.ghnService.calculateFee({
        from_district_id: fromCfg.districtId,
        from_ward_code: fromCfg.wardCode,
        service_id: service.service_id,
        to_district_id: ghnDistrictId,
        to_ward_code: ghnWardCode,
        height: parcel.height,
        length: parcel.length,
        width: parcel.width,
        weight: parcel.weight,
        insurance_value: Math.min(orderSubTotal, 5000000),
      });

      return Number(
        feeData?.total ?? feeData?.total_fee ?? feeData?.main_service ?? 0,
      );
    } catch (error: any) {
      console.error(
        'Lỗi tính phí ship GHN (Preview):',
        error?.response?.data || error.message,
      );
      // Trả về 0 hoặc một mức phí mặc định (vd: 30000) để không làm gãy luồng đặt hàng nếu GHN lỗi
      return 0;
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Status transition core
  // ─────────────────────────────────────────────────────────────

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

  /**
   * Thực hiện chuyển trạng thái ở tầng DB.
   * Mọi caller bắt buộc phải truyền `source` để enforce đúng transition map.
   */
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

  /**
   * API Tính giá tạm tính: SubTotal + Phí Ship - Giảm Giá
   */
  async previewOrder(dto: any) {
    let subTotal = 0;
    const previewItems: any[] = [];

    // 1. Tính tiền hàng dựa trên Database
    for (const item of dto.items) {
      const product = await this.productModel.findOne({
        _id: new Types.ObjectId(item.productId),
        'variants.sku': item.sku,
      });

      if (!product)
        throw new BadRequestException(
          `Sản phẩm không tồn tại (SKU: ${item.sku})`,
        );

      const variant = (product as any).variants.find(
        (v: any) => v.sku === item.sku,
      );
      if (!variant)
        throw new BadRequestException(
          `Phiên bản không tồn tại (SKU: ${item.sku})`,
        );

      this.assertCanSell(product, variant, item.sku);

      const sellPrice = this.getSellPrice(variant);
      const lineTotal = sellPrice * item.quantity;

      previewItems.push({
        productId: product._id,
        name: (product as any).name,
        sku: item.sku,
        price: sellPrice,
        quantity: item.quantity,
        lineTotal,
      });

      subTotal += lineTotal;
    }

    let shippingFee = 0;
    let discountAmount = 0;
    let couponDetails: { code: string; discountPercentage: number } | null =
      null;

    // 2. Tính phí ship GHN (Nếu Frontend gửi lên thông tin địa chỉ)
    if (dto.ghnDistrictId && dto.ghnWardCode) {
      shippingFee = await this.calculateExpectedShippingFee(
        previewItems,
        dto.ghnDistrictId,
        dto.ghnWardCode,
        subTotal,
      );
    }

    // 3. Tính mã giảm giá
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
      pricing: {
        subTotal,
        shippingFee,
        discountAmount,
        finalTotal,
      },
      coupon: couponDetails,
    };
  }

  /**
   * Public method chuyển trạng thái — bắt buộc truyền source.
   */
  async updateStatus(
    orderId: string,
    updateData: StatusUpdatePayload,
    source: TransitionSource = 'ghn',
  ): Promise<OrderDocument | null> {
    if (!updateData?.status) throw new BadRequestException('Thiếu status');

    const session = await this.orderModel.db.startSession();
    try {
      let updatedOrder: OrderDocument | null = null;
      try {
        await session.withTransaction(async () => {
          updatedOrder = await this.performStatusUpdate(
            orderId,
            updateData,
            source,
            session,
          );
        });
      } catch (error: any) {
        if (this.isTransactionNotSupported(error)) {
          updatedOrder = await this.performStatusUpdate(
            orderId,
            updateData,
            source,
          );
        } else {
          throw error;
        }
      }
      return updatedOrder;
    } finally {
      await session.endSession();
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  GHN-driven status progression
  // ─────────────────────────────────────────────────────────────

  private async progressOrderByShippingStatus(
    orderId: string,
    target: OrderStatus | null,
  ): Promise<OrderDocument | null> {
    if (!target) return this.orderModel.findById(orderId);

    let currentOrder: OrderDocument | null =
      await this.orderModel.findById(orderId);
    if (!currentOrder) throw new NotFoundException('Không tìm thấy đơn hàng');

    const go = async (next: OrderStatus) => {
      if (!currentOrder || currentOrder.status === next) return;
      const updated = await this.updateStatus(orderId, { status: next }, 'ghn');
      if (updated) currentOrder = updated;
    };

    switch (target) {
      case 'confirmed':
        if (currentOrder.status === 'pending') await go('confirmed');
        break;

      case 'shipping':
        if (currentOrder.status === 'pending') await go('confirmed');
        if (['confirmed', 'delivery_failed'].includes(currentOrder.status)) {
          await go('shipping');
        }
        break;

      case 'delivery_failed':
        if (currentOrder.status === 'pending') await go('confirmed');
        if (currentOrder.status === 'confirmed') await go('shipping');
        if (currentOrder.status === 'shipping') await go('delivery_failed');
        break;

      case 'delivered':
        if (currentOrder.status === 'pending') await go('confirmed');
        if (currentOrder.status === 'confirmed') await go('shipping');
        if (currentOrder.status === 'shipping') await go('delivered');
        break;

      case 'returned':
        if (currentOrder.status === 'pending') await go('confirmed');
        if (currentOrder.status === 'confirmed') await go('shipping');
        if (currentOrder.status === 'shipping') await go('delivery_failed');
        if (currentOrder.status === 'delivery_failed') await go('returned');
        break;

      case 'cancelled':
        if (
          ['pending', 'confirmed', 'shipping', 'delivery_failed'].includes(
            currentOrder.status,
          )
        ) {
          await go('cancelled');
        }
        break;

      case 'completed':
        if (currentOrder.status === 'delivered') await go('completed');
        break;
    }

    return currentOrder;
  }

  // ─────────────────────────────────────────────────────────────
  //  User operations
  // ─────────────────────────────────────────────────────────────

  async userCancelOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return this.updateStatus(orderId, { status: 'cancelled' }, 'user');
  }

  async confirmReceived(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return this.updateStatus(orderId, { status: 'completed' }, 'user');
  }

  async reportNotReceived(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return this.updateStatus(orderId, { status: 'delivery_failed' }, 'user');
  }

  async returnOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return this.updateStatus(orderId, { status: 'returned' }, 'user');
  }

  // ─────────────────────────────────────────────────────────────
  //  Admin operations
  // ─────────────────────────────────────────────────────────────

  async adminCancelOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (['completed', 'cancelled', 'returned'].includes(order.status)) {
      throw new BadRequestException('Đơn hàng đã kết thúc, không thể hủy');
    }

    // 🔥 LOGIC REFUND VNPAY TỰ ĐỘNG (Dành cho Admin)
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

      order.paymentStatus = 'refunded';
      await order.save();
    }

    await this.cancelExternalShipmentIfNeeded(order);
    return this.updateStatus(orderId, { status: 'cancelled' }, 'admin');
  }

  async adminCompleteOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'delivered') {
      throw new BadRequestException(
        'Chỉ có thể hoàn thành đơn hàng đang ở trạng thái "delivered"',
      );
    }

    return this.updateStatus(orderId, { status: 'completed' }, 'admin');
  }

  async adminConfirmOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Chỉ có thể xác nhận đơn hàng đang ở trạng thái "pending"',
      );
    }

    return this.updateStatus(orderId, { status: 'confirmed' }, 'admin');
  }

  private isMerchantSwitchableGhnStatus(status?: string) {
    const s = this.normalizeGhnStatus(status);
    return ['cancel', 'cancelled', 'return', 'storing'].includes(s || '');
  }

  private async triggerSupportedGhnDevAction(
    order: any,
    requestedStatus: string,
  ) {
    const providerOrderCode = order.shipping?.providerOrderCode;
    if (!providerOrderCode) {
      throw new BadRequestException('Đơn chưa có providerOrderCode GHN');
    }

    const s = this.normalizeGhnStatus(requestedStatus);
    if (!s) {
      throw new BadRequestException('Thiếu status để thao tác GHN');
    }

    if (s === 'cancel' || s === 'cancelled') {
      await this.ghnService.cancelOrder(providerOrderCode);
      return 'cancel';
    }

    if (s === 'return') {
      await this.ghnService.returnOrder(providerOrderCode);
      return 'return';
    }

    if (s === 'storing') {
      await this.ghnService.deliveryAgain(providerOrderCode);
      return 'storing';
    }

    throw new BadRequestException(
      `Status "${s}" không có public API đổi trạng thái từ merchant trên GHN. Hãy đổi trạng thái trên môi trường dev GHN theo tài liệu bạn đang dùng, sau đó gọi POST /api/v1/admin/orders/${order._id}/shipping/ghn/sync hoặc chờ webhook callback.`,
    );
  }
  // ─────────────────────────────────────────────────────────────
  //  GHN integration
  // ─────────────────────────────────────────────────────────────

  private async markGhnCreateFailed(orderId: string, reason: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) return;

    const shipping = this.ensureShipping(order);
    shipping.provider = 'ghn';
    shipping.env = this.ghnService.getEnv();
    shipping.syncStatus = 'create_failed';
    shipping.createError = reason;
    shipping.lastSyncedAt = new Date();

    await order.save();
  }

  private async tryAutoCreateGhnShipment(orderId: string) {
    if (process.env.GHN_ENABLE_AUTO_CREATE === 'false') return;
    if (!this.ghnService.hasConfig()) return;

    const order = await this.orderModel.findById(orderId);
    if (!order) return;
    if (order.paymentMethod !== 'cod') return;

    if (
      !order.shippingInfo?.ghnDistrictId ||
      !order.shippingInfo?.ghnWardCode
    ) {
      await this.markGhnCreateFailed(
        orderId,
        'Thiếu shippingInfo.ghnDistrictId hoặc shippingInfo.ghnWardCode',
      );
      return;
    }

    try {
      await this.createGhnShipment(orderId);
    } catch (error: any) {
      await this.markGhnCreateFailed(
        orderId,
        this.normalizeErrorMessage(error),
      );
    }
  }

  private async cancelExternalShipmentIfNeeded(order: any) {
    if (!order.shipping?.providerOrderCode) return;
    if (!this.ghnService.hasConfig()) return;

    const externalStatus = String(order.shipping?.status || '').toLowerCase();
    if (
      ['cancel', 'cancelled', 'delivered', 'returned'].includes(externalStatus)
    ) {
      return;
    }

    await this.ghnService.cancelOrder(order.shipping.providerOrderCode);

    const shipping = this.ensureShipping(order);
    shipping.syncStatus = 'synced';
    shipping.status = 'cancel';
    shipping.lastWebhookType = 'ManualCancel';
    shipping.lastSyncedAt = new Date();
    shipping.rawLastPayload = {
      providerOrderCode: order.shipping.providerOrderCode,
      source: 'manual-cancel',
    };
    this.pushShippingHistory(order, 'cancel', 'Huỷ vận đơn GHN thủ công');
    await order.save();
  }

  async createGhnShipment(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') {
      throw new BadRequestException(
        'Hiện tại chỉ auto GHN cho COD hoặc đơn đã thanh toán',
      );
    }
    if (['cancelled', 'completed', 'returned'].includes(order.status)) {
      throw new BadRequestException('Đơn hàng đã kết thúc');
    }
    if (!this.ghnService.hasConfig()) {
      throw new BadRequestException('Thiếu cấu hình GHN trong .env');
    }
    if (
      !order.shippingInfo?.ghnDistrictId ||
      !order.shippingInfo?.ghnWardCode
    ) {
      throw new BadRequestException(
        'Thiếu shippingInfo.ghnDistrictId hoặc shippingInfo.ghnWardCode',
      );
    }
    if (order.shipping?.providerOrderCode) return order;

    const shipping = this.ensureShipping(order);
    const fromCfg = this.ghnService.getFromConfig();
    const returnCfg = this.ghnService.getReturnConfig();
    const parcel = this.buildParcelSnapshot(order);

    const services = await this.ghnService.getAvailableServices(
      order.shippingInfo.ghnDistrictId,
      fromCfg.districtId,
    );
    const service = this.chooseBestGhnService(services);

    const feeData = await this.ghnService.calculateFee({
      from_district_id: fromCfg.districtId,
      from_ward_code: fromCfg.wardCode,
      service_id: service.service_id,
      to_district_id: order.shippingInfo.ghnDistrictId,
      to_ward_code: order.shippingInfo.ghnWardCode,
      height: parcel.height,
      length: parcel.length,
      width: parcel.width,
      weight: parcel.weight,
      insurance_value: Math.min(Number(order.totalAmount || 0), 5000000),
      cod_amount:
        order.paymentMethod === 'cod'
          ? Math.round(Number(order.totalAmount || 0))
          : 0,
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        code: item.sku,
        quantity: item.quantity,
        price: item.price,
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
        weight: Math.max(
          1,
          Math.round(parcel.weight / Math.max(1, order.items.length)),
        ),
      })),
    });

    const createRes = await this.ghnService.createOrder({
      payment_type_id: this.ghnService.getDefaultPaymentTypeId(),
      note: `Don hang ${order._id}`,
      required_note: this.ghnService.getDefaultRequiredNote(),

      from_name: fromCfg.name,
      from_phone: fromCfg.phone,
      from_address: fromCfg.address,
      from_ward_code: fromCfg.wardCode,
      from_district_id: fromCfg.districtId,

      return_name: returnCfg.name,
      return_phone: returnCfg.phone,
      return_address: returnCfg.address,
      return_ward_code: returnCfg.wardCode,
      return_district_id: returnCfg.districtId,

      client_order_code: String(order._id),

      to_name: order.shippingInfo.receiverName,
      to_phone: order.shippingInfo.phone,
      to_address: this.getReceiverAddress(order.shippingInfo),
      to_ward_code: order.shippingInfo.ghnWardCode,
      to_district_id: order.shippingInfo.ghnDistrictId,

      cod_amount:
        order.paymentMethod === 'cod'
          ? Math.round(Number(order.totalAmount || 0))
          : 0,
      content: (order.items || [])
        .map((item: any) => item.name)
        .join(', ')
        .slice(0, 2000),

      weight: parcel.weight,
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,

      insurance_value: Math.min(Number(order.totalAmount || 0), 5000000),

      service_id: Number(service.service_id),
      service_type_id: Number(service.service_type_id),

      items: (order.items || []).map((item: any) => ({
        name: item.name,
        code: item.sku,
        quantity: item.quantity,
        price: item.price,
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
        weight: Math.max(
          1,
          Math.round(parcel.weight / Math.max(1, order.items.length)),
        ),
        category: { level1: 'Ecommerce' },
      })),
    });

    shipping.provider = 'ghn';
    shipping.env = this.ghnService.getEnv();
    shipping.syncStatus = 'created';
    shipping.providerOrderCode = createRes?.order_code;
    shipping.clientOrderCode = String(order._id);
    shipping.serviceId = Number(service.service_id);
    shipping.serviceTypeId = Number(service.service_type_id);
    shipping.fee = Number(
      createRes?.total_fee ??
        feeData?.total ??
        feeData?.total_fee ??
        feeData?.main_service ??
        0,
    );
    shipping.codAmount =
      order.paymentMethod === 'cod'
        ? Math.round(Number(order.totalAmount || 0))
        : 0;
    shipping.expectedDeliveryTime = createRes?.expected_delivery_time
      ? new Date(createRes.expected_delivery_time)
      : undefined;
    shipping.parcelSnapshot = parcel;
    shipping.createError = undefined;
    shipping.lastWebhookType = 'CreateRequest';
    shipping.lastSyncedAt = new Date();
    shipping.rawCreateResponse = createRes;
    shipping.rawLastPayload = createRes;

    await order.save();

    return this.handleGhnWebhook({
      Type: 'Create',
      Status: createRes?.status || 'ready_to_pick',
      OrderCode: createRes?.order_code,
      ClientOrderCode: String(order._id),
      CODAmount: shipping.codAmount,
      Fee: shipping.fee,
      RawCreateResponse: createRes,
    });
  }

  async getGhnShipmentDetail(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (!this.ghnService.hasConfig()) {
      throw new BadRequestException('Thiếu cấu hình GHN trong .env');
    }

    if (order.shipping?.providerOrderCode) {
      return this.ghnService.getOrderDetail(order.shipping.providerOrderCode);
    }
    return this.ghnService.getOrderDetailByClientCode(String(order._id));
  }

  async syncAllActiveGhnShipments() {
    // Find orders with GHN order code and not in a final state
    const orders = await this.orderModel.find({
      'shipping.providerOrderCode': { $exists: true, $ne: '' },
      status: { $in: ['confirmed', 'shipping', 'delivered'] },
    });

    const results = {
      total: orders.length,
      success: 0,
      failed: 0,
    };

    // Sequential execution to respect GHN API limits
    for (const order of orders) {
      try {
        await this.syncGhnShipment(String(order._id));
        results.success++;
      } catch (error: any) {
        results.failed++;
      }
    }

    return results;
  }

  async syncGhnShipment(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const detailRaw = await this.getGhnShipmentDetail(orderId);
    const detail = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;

    if (!detail) {
      throw new BadRequestException('GHN không trả về chi tiết vận đơn');
    }

    return this.handleGhnWebhook({
      Type: 'ManualSync',
      Status:
        detail?.status ||
        detail?.Status ||
        detail?.current_status ||
        detail?.CurrentStatus,
      OrderCode:
        detail?.order_code ||
        detail?.OrderCode ||
        order.shipping?.providerOrderCode,
      ClientOrderCode:
        detail?.client_order_code ||
        detail?.ClientOrderCode ||
        String(order._id),
      CODAmount: detail?.cod_amount ?? detail?.CODAmount ?? order.totalAmount,
      Fee: detail?.fee ?? detail?.total_fee,
      RawDetail: detail,
    });
  }

  async simulateGhnStatus(orderId: string, status: string, type?: string) {
    const allowSimulate =
      process.env.NODE_ENV !== 'production' &&
      process.env.GHN_ALLOW_SIMULATE !== 'false';

    if (!allowSimulate) {
      throw new BadRequestException(
        'Chế độ simulate GHN chỉ bật ở môi trường dev/demo',
      );
    }

    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const normalizedStatus = this.normalizeGhnStatus(status);
    if (!normalizedStatus) {
      throw new BadRequestException('Thiếu status để simulate GHN');
    }

    const hasRealGhnShipment =
      !!order.shipping?.providerOrderCode && this.ghnService.hasConfig();

    /**
     * Nếu đơn đã có vận đơn GHN thật:
     * - chỉ gọi public API GHN với các action merchant được support rõ
     *   như cancel / return / storing
     * - các status logistics còn lại phải đổi từ GHN dev UI/doc,
     *   rồi sync/webhook về hệ thống local
     */
    if (hasRealGhnShipment) {
      if (this.isMerchantSwitchableGhnStatus(normalizedStatus)) {
        await this.triggerSupportedGhnDevAction(order, normalizedStatus);
        return this.syncGhnShipment(orderId);
      }

      throw new BadRequestException(
        `Đơn này đã có vận đơn GHN thật (${order.shipping?.providerOrderCode}). Status "${normalizedStatus}" không nên simulate local. Hãy đổi trạng thái trên môi trường dev GHN theo tài liệu bạn cung cấp, sau đó gọi POST /api/v1/admin/orders/${orderId}/shipping/ghn/sync hoặc chờ webhook callback.`,
      );
    }

    /**
     * Fallback local:
     * Chỉ dùng cho demo nội bộ khi chưa tạo vận đơn GHN thật.
     */
    return this.handleGhnWebhook({
      Type: type || 'Switch_status',
      Status: normalizedStatus,
      OrderCode: order.shipping?.providerOrderCode || `SIM-${order._id}`,
      ClientOrderCode: String(order._id),
      CODAmount: Number(order.totalAmount || 0),
      simulated: true,
      source: 'local-dev-fallback',
    });
  }

  async handleGhnWebhook(payload: any) {
    const providerOrderCode =
      payload?.OrderCode || payload?.order_code || payload?.orderCode;
    const clientOrderCode =
      payload?.ClientOrderCode ||
      payload?.client_order_code ||
      payload?.clientOrderCode;
    const ghnStatus = this.normalizeGhnStatus(
      payload?.Status ?? payload?.status ?? payload?.current_status,
    );

    if (payload?.simulated && !ghnStatus) {
      throw new BadRequestException('Payload simulate GHN thiếu Status');
    }

    let order = providerOrderCode
      ? await this.orderModel.findOne({
          'shipping.providerOrderCode': providerOrderCode,
        })
      : null;

    if (
      !order &&
      clientOrderCode &&
      Types.ObjectId.isValid(String(clientOrderCode))
    ) {
      order = await this.orderModel.findById(clientOrderCode);
    }

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy order local để map GHN webhook',
      );
    }

    const shipping = this.ensureShipping(order);
    shipping.provider = 'ghn';
    shipping.env = this.ghnService.getEnv();
    shipping.syncStatus = 'synced';
    shipping.providerOrderCode =
      providerOrderCode || shipping.providerOrderCode;
    shipping.clientOrderCode =
      clientOrderCode || shipping.clientOrderCode || String(order._id);
    shipping.status = ghnStatus || shipping.status;
    shipping.codAmount =
      payload?.CODAmount ?? payload?.cod_amount ?? shipping.codAmount;
    shipping.fee = payload?.Fee ?? payload?.fee ?? shipping.fee;
    if (payload?.RawCreateResponse) {
      shipping.rawCreateResponse = payload.RawCreateResponse;
    }
    shipping.lastWebhookType = payload?.Type || payload?.type || 'Webhook';
    shipping.lastSyncedAt = new Date();
    shipping.rawLastPayload = payload;

    if (ghnStatus) {
      this.pushShippingHistory(
        order,
        ghnStatus,
        `GHN ${shipping.lastWebhookType}`,
        payload,
      );
    }

    await order.save();

    const targetStatus = this.mapGhnStatusToOrderStatus(ghnStatus);
    await this.progressOrderByShippingStatus(String(order._id), targetStatus);

    return this.orderModel.findById(order._id);
  }

  // ─────────────────────────────────────────────────────────────
  //  Order CRUD / user-facing
  // ─────────────────────────────────────────────────────────────

  async create(userId: string, dto: any) {
    const paymentMethod: PaymentMethod = dto.paymentMethod || 'cod';
    const normalizedIdempotencyKey = dto.idempotencyKey?.trim();

    // Disable auto-create GHN shipment for COD as per user request to wait for admin confirmation
    const shouldAutoCreateGhn = false;

    if (
      shouldAutoCreateGhn &&
      (!dto?.shippingInfo?.ghnDistrictId || !dto?.shippingInfo?.ghnWardCode)
    ) {
      throw new BadRequestException(
        'Đơn COD dùng GHN yêu cầu shippingInfo.ghnDistrictId và shippingInfo.ghnWardCode',
      );
    }

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

      try {
        await session.withTransaction(async () => {
          createdOrder = await this.buildOrderDocument(
            userId,
            dto,
            paymentMethod,
            normalizedIdempotencyKey,
            session,
          );
        });
      } catch (error: any) {
        if (this.isTransactionNotSupported(error)) {
          createdOrder = await this.buildOrderDocument(
            userId,
            dto,
            paymentMethod,
            normalizedIdempotencyKey,
          );
        } else {
          throw error;
        }
      }

      if (!createdOrder) {
        throw new BadRequestException('Không thể tạo đơn hàng');
      }

      // Auto-create GHN shipment removed to wait for admin manual confirmation & shipment creation
      // if (paymentMethod === 'cod') {
      //   await this.tryAutoCreateGhnShipment(String((createdOrder as any)._id));
      // }

      const fresh = await this.orderModel.findById((createdOrder as any)._id);
      return fresh || createdOrder;
    } catch (error: any) {
      if (error?.code === 11000 && normalizedIdempotencyKey) {
        const existingOrder = await this.orderModel.findOne({
          userId: new Types.ObjectId(userId),
          idempotencyKey: normalizedIdempotencyKey,
        });
        if (existingOrder) return existingOrder;
      }

      if (this.isDuplicateNullIdempotencyError(error)) {
        throw new BadRequestException(
          'DB đang còn unique index cũ cho idempotencyKey = null. Hãy drop index userId_1_idempotencyKey_1 và tạo lại partial index.',
        );
      }

      this.throwReadableOrderError(error);
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

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) throw new BadRequestException('Order not found');

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng đang chờ xử lý hoặc đã xác nhận',
      );
    }

    // 🔥 LOGIC REFUND VNPAY TỰ ĐỘNG
    if (order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid') {
      // Nhờ PaymentsService gọi API Refund
      const refundResult = await this.paymentsService.refundTransaction(
        order,
        userId,
      );

      if (!refundResult.success) {
        throw new BadRequestException(
          `Không thể hủy đơn. Yêu cầu hoàn tiền VNPay thất bại: ${refundResult.message}`,
        );
      }

      // Đánh dấu trạng thái thanh toán là đã hoàn
      order.paymentStatus = 'refunded';
      await order.save();
    }

    await this.cancelExternalShipmentIfNeeded(order);
    return this.updateStatus(orderId, { status: 'cancelled' }, 'admin'); // (Hoặc 'user')
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

  // ─────────────────────────────────────────────────────────────
  //  Payment callbacks (source: 'system')
  // ─────────────────────────────────────────────────────────────

  // Thêm tham số vnpayTransactionDate vào đây
  async confirmVnpayPayment(orderId: string, vnpayTransactionDate?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status === 'cancelled') {
      throw new BadRequestException('Đơn hàng đã bị hủy');
    }

    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();

      // 🔥 Lưu lại thời gian giao dịch thực tế của VNPay
      if (vnpayTransactionDate) {
        order.vnpayTransactionDate = vnpayTransactionDate;
      }

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

    if (
      order.status === 'cancelled' ||
      order.status === 'completed' ||
      order.status === 'returned'
    ) {
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

  // ─────────────────────────────────────────────────────────────
  //  Analytics helpers
  // ─────────────────────────────────────────────────────────────

  private normalizeStatsGroupBy(groupBy?: string): StatsGroupBy {
    if (groupBy === 'week' || groupBy === 'month' || groupBy === 'quarter')
      return groupBy;
    return 'day';
  }

  private clampPositiveInt(value: any, fallback: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private resolveStatsRangeValue(
    groupBy: StatsGroupBy,
    range?: StatsRangeInput,
  ) {
    if (groupBy === 'quarter')
      return this.clampPositiveInt(range?.quarters, 4, 20);
    if (groupBy === 'week') return this.clampPositiveInt(range?.weeks, 12, 104);
    if (groupBy === 'month')
      return this.clampPositiveInt(range?.months, 12, 60);
    return this.clampPositiveInt(range?.days, 30, 366);
  }

  // Lấy ra 2 mốc thời gian: Bắt đầu của kỳ trước và Bắt đầu của kỳ hiện tại
  private buildComparisonDates(groupBy: StatsGroupBy, range?: StatsRangeInput) {
    const value = this.resolveStatsRangeValue(groupBy, range);
    const currentStart = new Date();
    const previousStart = new Date();

    currentStart.setHours(0, 0, 0, 0);
    previousStart.setHours(0, 0, 0, 0);

    if (groupBy === 'day') {
      currentStart.setDate(currentStart.getDate() - (value - 1));
      previousStart.setDate(currentStart.getDate() - value);
    } else if (groupBy === 'week') {
      const dayOffset = (currentStart.getDay() + 6) % 7;
      currentStart.setDate(
        currentStart.getDate() - dayOffset - (value - 1) * 7,
      );
      previousStart.setDate(currentStart.getDate() - value * 7);
    } else if (groupBy === 'month') {
      currentStart.setDate(1);
      currentStart.setMonth(currentStart.getMonth() - (value - 1));
      previousStart.setDate(1);
      previousStart.setMonth(currentStart.getMonth() - value);
    } else if (groupBy === 'quarter') {
      const currentMonth = currentStart.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      currentStart.setDate(1);
      currentStart.setMonth(quarterStartMonth - (value - 1) * 3);
      previousStart.setDate(1);
      previousStart.setMonth(currentStart.getMonth() - value * 3);
    }

    return { previousStart, currentStart, value };
  }

  private buildPeriodGroupExpr(field: string, groupBy: StatsGroupBy) {
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
      return { year: { $isoWeekYear: dateRef }, week: { $isoWeek: dateRef } };
    }
    if (groupBy === 'quarter') {
      return {
        year: { $year: { date: dateRef, timezone: 'Asia/Ho_Chi_Minh' } },
        quarter: {
          $ceil: {
            $divide: [
              { $month: { date: dateRef, timezone: 'Asia/Ho_Chi_Minh' } },
              3,
            ],
          },
        },
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
    groupBy: StatsGroupBy,
    sourcePath = '$_id',
  ): Record<string, any> {
    if (groupBy === 'day' || groupBy === 'month') return { period: sourcePath };
    if (groupBy === 'quarter') {
      return {
        period: {
          $concat: [
            { $toString: `${sourcePath}.year` },
            '-Q',
            { $toString: `${sourcePath}.quarter` },
          ],
        },
      };
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

  private calculateGrowth(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private getTrend(current: number, previous: number) {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'flat';
  }

  private normalizeTopSortBy(sortBy?: string): TopSortBy {
    if (sortBy === 'revenue' || sortBy === 'profit') return sortBy;
    return 'quantity';
  }

  // ─────────────────────────────────────────────────────────────
  //  Analytics
  // ─────────────────────────────────────────────────────────────

  async getProductsSoldByDay(days = 7) {
    const safeDays = this.clampPositiveInt(days, 7, 366);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    return this.orderModel.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: start },
        },
      },
      {
        $addFields: {
          soldAt: '$completedAt',
        },
      },
      { $unwind: '$items' },
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
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: { day: 1 } },
    ]);
  }

  async getRevenueStats(
    groupBy: StatsGroupBy = 'day',
    range?: StatsRangeInput,
  ) {
    const normalizedGroupBy = this.normalizeStatsGroupBy(groupBy);
    const { previousStart, currentStart, value } = this.buildComparisonDates(
      normalizedGroupBy,
      range,
    );

    const rawItems = await this.orderModel.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: previousStart }, // Query từ thời điểm của kỳ trước
        },
      },
      {
        $addFields: {
          soldAt: '$completedAt',
          grossRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $ifNull: ['$$item.lineTotal', 0] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: this.buildPeriodGroupExpr('soldAt', normalizedGroupBy),
          firstDate: { $min: '$soldAt' }, // Lấy ngày thực tế đầu tiên để so sánh kỳ
          orderCount: { $sum: 1 },
          grossRevenue: { $sum: '$grossRevenue' },
          discountAmount: { $sum: { $ifNull: ['$discountAmount', 0] } },
          netRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          ...this.buildPeriodProjectExpr(normalizedGroupBy),
          firstDate: 1,
          orderCount: 1,
          grossRevenue: 1,
          discountAmount: 1,
          netRevenue: 1,
        },
      },
      { $sort: { firstDate: 1 } }, // Sắp xếp theo ngày tăng dần
    ]);

    const currentItems: any[] = [];
    const currentSummary = {
      orderCount: 0,
      grossRevenue: 0,
      discountAmount: 0,
      netRevenue: 0,
    };
    const previousSummary = {
      orderCount: 0,
      grossRevenue: 0,
      discountAmount: 0,
      netRevenue: 0,
    };

    for (const item of rawItems) {
      const isCurrent = new Date(item.firstDate) >= currentStart;
      delete item.firstDate; // Xóa field này trước khi trả về Frontend

      if (isCurrent) {
        currentItems.push(item);
        currentSummary.orderCount += item.orderCount || 0;
        currentSummary.grossRevenue += item.grossRevenue || 0;
        currentSummary.discountAmount += item.discountAmount || 0;
        currentSummary.netRevenue += item.netRevenue || 0;
      } else {
        previousSummary.orderCount += item.orderCount || 0;
        previousSummary.grossRevenue += item.grossRevenue || 0;
        previousSummary.discountAmount += item.discountAmount || 0;
        previousSummary.netRevenue += item.netRevenue || 0;
      }
    }

    return {
      groupBy: normalizedGroupBy,
      range: value,
      summary: {
        current: currentSummary,
        previous: previousSummary,
        growth: {
          netRevenue: this.calculateGrowth(
            currentSummary.netRevenue,
            previousSummary.netRevenue,
          ),
          trend: this.getTrend(
            currentSummary.netRevenue,
            previousSummary.netRevenue,
          ),
        },
      },
      chartData: currentItems,
    };
  }

  async getProfitStats(groupBy: StatsGroupBy = 'day', range?: StatsRangeInput) {
    const normalizedGroupBy = this.normalizeStatsGroupBy(groupBy);
    const { previousStart, currentStart, value } = this.buildComparisonDates(
      normalizedGroupBy,
      range,
    );

    const rawItems = await this.orderModel.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: previousStart },
        },
      },
      {
        $addFields: {
          soldAt: '$completedAt',
          grossRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $ifNull: ['$$item.lineTotal', 0] },
              },
            },
          },
          cogs: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $cond: [
                    {
                      $gt: [
                        { $size: { $ifNull: ['$$item.lotAllocations', []] } },
                        0,
                      ],
                    },
                    {
                      $sum: {
                        $map: {
                          input: '$$item.lotAllocations',
                          as: 'alloc',
                          in: {
                            $multiply: [
                              { $ifNull: ['$$alloc.unitCost', 0] },
                              { $ifNull: ['$$alloc.quantity', 0] },
                            ],
                          },
                        },
                      },
                    },
                    {
                      $multiply: [
                        { $ifNull: ['$$item.unitCostSnapshot', 0] },
                        { $ifNull: ['$$item.quantity', 0] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: this.buildPeriodGroupExpr('soldAt', normalizedGroupBy),
          firstDate: { $min: '$soldAt' },
          orderCount: { $sum: 1 },
          grossRevenue: { $sum: '$grossRevenue' },
          netRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
          cogs: { $sum: '$cogs' },
          shippingCost: { $sum: { $ifNull: ['$shipping.fee', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          ...this.buildPeriodProjectExpr(normalizedGroupBy),
          firstDate: 1,
          orderCount: 1,
          grossRevenue: 1,
          netRevenue: 1,
          cogs: 1,
          grossProfit: { $subtract: ['$grossRevenue', '$cogs'] },
          netProfit: {
            $subtract: ['$netRevenue', { $add: ['$cogs', '$shippingCost'] }],
          },
        },
      },
      { $sort: { firstDate: 1 } },
    ]);

    const currentItems: any[] = [];
    const currentSummary = {
      netRevenue: 0,
      cogs: 0,
      shippingCost: 0,
      netProfit: 0,
    };
    const previousSummary = {
      netRevenue: 0,
      cogs: 0,
      shippingCost: 0,
      netProfit: 0,
    };

    for (const item of rawItems) {
      const isCurrent = new Date(item.firstDate) >= currentStart;
      delete item.firstDate;

      if (isCurrent) {
        currentItems.push(item);
        currentSummary.netRevenue += item.netRevenue || 0;
        currentSummary.cogs += item.cogs || 0;
        currentSummary.shippingCost += item.shippingCost || 0; // 🔥 Tracking thêm
        currentSummary.netProfit += item.netProfit || 0;
      } else {
        previousSummary.netRevenue += item.netRevenue || 0;
        previousSummary.cogs += item.cogs || 0;
        previousSummary.shippingCost += item.shippingCost || 0; // 🔥 Tracking thêm
        previousSummary.netProfit += item.netProfit || 0;
      }
    }
    return {
      groupBy: normalizedGroupBy,
      range: value,
      summary: {
        current: currentSummary,
        previous: previousSummary,
        growth: {
          netProfit: this.calculateGrowth(
            currentSummary.netProfit,
            previousSummary.netProfit,
          ),
          trend: this.getTrend(
            currentSummary.netProfit,
            previousSummary.netProfit,
          ),
        },
      },
      chartData: currentItems,
    };
  }

  async getTopSkus(days = 30, limit = 10, sortBy: TopSortBy = 'quantity') {
    const safeDays = this.clampPositiveInt(days, 30, 366);
    const safeLimit = this.clampPositiveInt(limit, 10, 100);
    const safeSortBy = this.normalizeTopSortBy(sortBy);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const sortStage: Record<string, 1 | -1> =
      safeSortBy === 'revenue'
        ? { grossRevenue: -1, quantitySold: -1, grossProfit: -1, sku: 1 }
        : safeSortBy === 'profit'
          ? { grossProfit: -1, grossRevenue: -1, quantitySold: -1, sku: 1 }
          : { quantitySold: -1, grossRevenue: -1, grossProfit: -1, sku: 1 };

    const items = await this.orderModel.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: start },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.sku',
          productId: { $first: '$items.productId' },
          sku: { $first: '$items.sku' },
          name: { $first: '$items.name' },
          imageUrl: { $first: '$items.imageUrl' },
          attributes: { $first: '$items.attributes' },
          quantitySold: { $sum: '$items.quantity' },
          grossRevenue: { $sum: '$items.lineTotal' },
          estimatedCost: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $size: { $ifNull: ['$items.lotAllocations', []] } },
                    0,
                  ],
                },
                {
                  $sum: {
                    $map: {
                      input: '$items.lotAllocations',
                      as: 'alloc',
                      in: {
                        $multiply: [
                          { $ifNull: ['$$alloc.unitCost', 0] },
                          { $ifNull: ['$$alloc.quantity', 0] },
                        ],
                      },
                    },
                  },
                },
                {
                  $multiply: [
                    { $ifNull: ['$items.unitCostSnapshot', 0] },
                    { $ifNull: ['$items.quantity', 0] },
                  ],
                },
              ],
            },
          },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          productId: 1,
          sku: 1,
          name: 1,
          imageUrl: 1,
          attributes: 1,
          quantitySold: 1,
          grossRevenue: 1,
          estimatedCost: 1,
          grossProfit: { $subtract: ['$grossRevenue', '$estimatedCost'] },
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: sortStage },
      { $limit: safeLimit },
    ]);

    return {
      days: safeDays,
      limit: safeLimit,
      sortBy: safeSortBy,
      items,
    };
  }

  async getTopProducts(days = 30, limit = 10, sortBy: TopSortBy = 'quantity') {
    const safeDays = this.clampPositiveInt(days, 30, 366);
    const safeLimit = this.clampPositiveInt(limit, 10, 100);
    const safeSortBy = this.normalizeTopSortBy(sortBy);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const sortStage: Record<string, 1 | -1> =
      safeSortBy === 'revenue'
        ? { grossRevenue: -1, quantitySold: -1, grossProfit: -1, name: 1 }
        : safeSortBy === 'profit'
          ? { grossProfit: -1, grossRevenue: -1, quantitySold: -1, name: 1 }
          : { quantitySold: -1, grossRevenue: -1, grossProfit: -1, name: 1 };

    const items = await this.orderModel.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: start },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          imageUrl: { $first: '$items.imageUrl' },
          skuSet: { $addToSet: '$items.sku' },
          quantitySold: { $sum: '$items.quantity' },
          grossRevenue: { $sum: '$items.lineTotal' },
          estimatedCost: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $size: { $ifNull: ['$items.lotAllocations', []] } },
                    0,
                  ],
                },
                {
                  $sum: {
                    $map: {
                      input: '$items.lotAllocations',
                      as: 'alloc',
                      in: {
                        $multiply: [
                          { $ifNull: ['$$alloc.unitCost', 0] },
                          { $ifNull: ['$$alloc.quantity', 0] },
                        ],
                      },
                    },
                  },
                },
                {
                  $multiply: [
                    { $ifNull: ['$items.unitCostSnapshot', 0] },
                    { $ifNull: ['$items.quantity', 0] },
                  ],
                },
              ],
            },
          },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          imageUrl: 1,
          skus: '$skuSet',
          skuCount: { $size: '$skuSet' },
          quantitySold: 1,
          grossRevenue: 1,
          estimatedCost: 1,
          grossProfit: { $subtract: ['$grossRevenue', '$estimatedCost'] },
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: sortStage },
      { $limit: safeLimit },
    ]);

    return {
      days: safeDays,
      limit: safeLimit,
      sortBy: safeSortBy,
      items,
    };
  }
}
