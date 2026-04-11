import {
  BadRequestException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { GhnService } from '../ghn/ghn.service';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersShippingService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly ghnService: GhnService,
    // Inject OrdersService để xài lại hàm updateStatus khi webhook trả về
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  private normalizeErrorMessage(error: any) {
    const responseMessage = error?.response?.message;
    if (Array.isArray(responseMessage)) return responseMessage.join(', ');
    if (typeof responseMessage === 'string' && responseMessage.trim())
      return responseMessage;
    if (typeof error?.message === 'string' && error.message.trim())
      return error.message;
    return 'Lỗi không xác định từ GHN';
  }

  ensureShipping(order: any) {
    if (!order.shipping) {
      order.shipping = {
        provider: 'ghn',
        env: this.ghnService.getEnv(),
        syncStatus: 'not_created',
        statusHistory: [],
      };
    }
    if (!order.shipping.statusHistory) order.shipping.statusHistory = [];
    return order.shipping;
  }

  pushShippingHistory(order: any, status: string, note?: string, raw?: any) {
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

  buildParcelSnapshot(order: any) {
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

  chooseBestGhnService(services: any[]) {
    if (!Array.isArray(services) || services.length === 0)
      throw new BadRequestException('GHN không trả về service khả dụng');
    return (
      services.find((s) => Number(s?.service_type_id) === 2) ||
      services.find((s) => Number(s?.service_id) > 0) ||
      services[0]
    );
  }

  normalizeGhnStatus(status?: any): string | undefined {
    return (
      String(status ?? '')
        .trim()
        .toLowerCase() || undefined
    );
  }

  mapGhnStatusToOrderStatus(status?: string): OrderStatus | null {
    const s = this.normalizeGhnStatus(status);
    if (!s) return null;
    if (['ready_to_pick', 'picking', 'money_collect_picking'].includes(s))
      return 'confirmed';
    if (
      [
        'picked',
        'storing',
        'transporting',
        'sorting',
        'delivering',
        'money_collect_delivering',
      ].includes(s)
    )
      return 'shipping';
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
    )
      return 'delivery_failed';
    if (s === 'delivered') return 'delivered';
    if (s === 'returned') return 'returned';
    if (s === 'cancel') return 'cancelled';
    return null;
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
    if (!providerOrderCode)
      throw new BadRequestException('Đơn chưa có providerOrderCode GHN');
    const s = this.normalizeGhnStatus(requestedStatus);
    if (!s) throw new BadRequestException('Thiếu status để thao tác GHN');

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
      `Status "${s}" không có public API đổi trạng thái từ merchant.`,
    );
  }

  async calculateExpectedShippingFee(
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
        'Lỗi tính phí ship GHN:',
        error?.response?.data || error.message,
      );
      return 0;
    }
  }

  async cancelExternalShipmentIfNeeded(order: any) {
    if (!order.shipping?.providerOrderCode || !this.ghnService.hasConfig())
      return;
    const externalStatus = String(order.shipping?.status || '').toLowerCase();
    if (
      ['cancel', 'cancelled', 'delivered', 'returned'].includes(externalStatus)
    )
      return;

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

    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid')
      throw new BadRequestException(
        'Hiện tại chỉ auto GHN cho COD hoặc đơn đã thanh toán',
      );
    if (['cancelled', 'completed', 'returned'].includes(order.status))
      throw new BadRequestException('Đơn hàng đã kết thúc');
    if (!this.ghnService.hasConfig())
      throw new BadRequestException('Thiếu cấu hình GHN trong .env');
    if (!order.shippingInfo?.ghnDistrictId || !order.shippingInfo?.ghnWardCode)
      throw new BadRequestException('Thiếu địa chỉ GHN');
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
    if (!this.ghnService.hasConfig())
      throw new BadRequestException('Thiếu cấu hình GHN trong .env');
    if (order.shipping?.providerOrderCode)
      return this.ghnService.getOrderDetail(order.shipping.providerOrderCode);
    return this.ghnService.getOrderDetailByClientCode(String(order._id));
  }

  async syncAllActiveGhnShipments() {
    const orders = await this.orderModel.find({
      'shipping.providerOrderCode': { $exists: true, $ne: '' },
      status: { $in: ['confirmed', 'shipping', 'delivered'] },
    });
    const results = { total: orders.length, success: 0, failed: 0 };
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
    if (!detail)
      throw new BadRequestException('GHN không trả về chi tiết vận đơn');

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
    if (!allowSimulate)
      throw new BadRequestException(
        'Chế độ simulate GHN chỉ bật ở môi trường dev/demo',
      );
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const normalizedStatus = this.normalizeGhnStatus(status);
    if (!normalizedStatus)
      throw new BadRequestException('Thiếu status để simulate GHN');

    const hasRealGhnShipment =
      !!order.shipping?.providerOrderCode && this.ghnService.hasConfig();
    if (hasRealGhnShipment) {
      if (this.isMerchantSwitchableGhnStatus(normalizedStatus)) {
        await this.triggerSupportedGhnDevAction(order, normalizedStatus);
        return this.syncGhnShipment(orderId);
      }
      throw new BadRequestException(
        `Đơn này đã có vận đơn thật. API thao tác merchant bị giới hạn.`,
      );
    }

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

    if (payload?.simulated && !ghnStatus)
      throw new BadRequestException('Payload simulate GHN thiếu Status');

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
    if (!order)
      throw new NotFoundException(
        'Không tìm thấy order local để map GHN webhook',
      );

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
    if (payload?.RawCreateResponse)
      shipping.rawCreateResponse = payload.RawCreateResponse;
    shipping.lastWebhookType = payload?.Type || payload?.type || 'Webhook';
    shipping.lastSyncedAt = new Date();
    shipping.rawLastPayload = payload;

    if (ghnStatus)
      this.pushShippingHistory(
        order,
        ghnStatus,
        `GHN ${shipping.lastWebhookType}`,
        payload,
      );
    await order.save();

    const targetStatus = this.mapGhnStatusToOrderStatus(ghnStatus);

    // Gọi ngược sang OrdersService để update OrderStatus
    if (targetStatus && targetStatus !== order.status) {
      await this.ordersService.updateStatus(
        String(order._id),
        { status: targetStatus },
        'ghn',
      );
    }

    return this.orderModel.findById(order._id);
  }
}
