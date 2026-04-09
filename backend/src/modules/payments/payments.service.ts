import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../orders/schemas/order.schema';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { OrdersService } from '../orders/orders.service';
@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async createVNPayUrl(orderId: string, userId: string, ipAddr: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.paymentMethod !== 'vnpay') {
      throw new BadRequestException('Đơn hàng này không dùng VNPay');
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException('Đơn hàng đã kết thúc');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Đơn hàng đã thanh toán');
    }

    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
      throw new Error('VNPAY environment variables are missing');
    }

    const date = new Date();
    const createDate = this.formatDate(date);
    const amount = Math.floor(order.totalAmount * 100);

    let vnp_Params: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order._id.toString(),
      vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    vnp_Params = this.sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    const finalUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });

    return { paymentUrl: finalUrl };
  }

  async checkReturnUrl(query: any) {
    let vnp_Params = { ...query };

    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sorted = this.sortObject(vnp_Params);

    const secretKey = process.env.VNP_HASHSECRET as string;
    if (!secretKey) throw new Error('Secret key is missing in .env');

    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const responseCode = vnp_Params['vnp_ResponseCode'];
      return {
        success: responseCode === '00',
        orderId: vnp_Params['vnp_TxnRef'],
      };
    }

    return { success: false, message: 'Invalid Signature' };
  }

  async handleVnPayIpn(query: any) {
    let vnp_Params = { ...query };
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sorted = this.sortObject(vnp_Params);
    const secretKey = process.env.VNP_HASHSECRET as string;
    if (!secretKey) return { RspCode: '99', Message: 'Missing configuration' };

    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const orderId = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (order.paymentStatus === 'paid') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (responseCode === '00') {
      await this.ordersService.confirmVnpayPayment(
        orderId,
        vnp_Params['vnp_PayDate'],
      );
    } else {
      await this.ordersService.handlePaymentFailed(orderId);
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private sortObject(obj: any): Record<string, string> {
    const sorted: Record<string, string> = {};
    const str: string[] = [];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key));
      }
    }

    str.sort();

    for (let i = 0; i < str.length; i++) {
      sorted[str[i]] = encodeURIComponent(obj[str[i]]).replace(/%20/g, '+');
    }

    return sorted;
  }

  private formatDate(date: Date) {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  /**
   * Gọi API Refund của VNPay
   * @param order Đối tượng đơn hàng
   * @param user Người thực hiện (admin/system)
   */
  async refundTransaction(order: any, user: string = 'system') {
    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    // API Hoàn tiền thường dùng url khác với url thanh toán
    const vnpApiUrl =
      process.env.VNP_API_URL ||
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

    if (!tmnCode || !secretKey || !vnpApiUrl) {
      throw new Error('Thiếu cấu hình VNPAY Refund trong .env');
    }

    const vnp_RequestId = crypto.randomUUID(); // Mã định danh request
    const vnp_Version = '2.1.0';
    const vnp_Command = 'refund';
    const vnp_TransactionType = '02'; // '02': Hoàn toàn phần, '03': Hoàn một phần
    const vnp_TxnRef = String(order._id);
    const vnp_Amount = Math.floor(order.totalAmount * 100);
    const vnp_OrderInfo = `Hoan tien don hang ${vnp_TxnRef}`;
    const vnp_TransactionNo = ''; // Để trống nếu không lưu mã GD VNPay
    const vnp_TransactionDate =
      order.vnpayTransactionDate || this.formatDate(order.paidAt || new Date());
    const vnp_CreateBy = user;
    const vnp_CreateDate = this.formatDate(new Date());
    const vnp_IpAddr = '127.0.0.1'; // Hoặc lấy IP server thực tế

    // String cần mã hoá cho Refund API có format khắt khe (phân cách bằng dấu '|')
    const dataToHash = [
      vnp_RequestId,
      vnp_Version,
      vnp_Command,
      tmnCode,
      vnp_TransactionType,
      vnp_TxnRef,
      vnp_Amount,
      vnp_TransactionNo,
      vnp_TransactionDate,
      vnp_CreateBy,
      vnp_CreateDate,
      vnp_IpAddr,
      vnp_OrderInfo,
    ].join('|');

    const hmac = crypto.createHmac('sha512', secretKey);
    const vnp_SecureHash = hmac
      .update(Buffer.from(dataToHash, 'utf-8'))
      .digest('hex');

    const payload = {
      vnp_RequestId,
      vnp_Version,
      vnp_Command,
      vnp_TmnCode: tmnCode,
      vnp_TransactionType,
      vnp_TxnRef,
      vnp_Amount,
      vnp_TransactionNo,
      vnp_TransactionDate,
      vnp_CreateBy,
      vnp_CreateDate,
      vnp_IpAddr,
      vnp_OrderInfo,
      vnp_SecureHash,
    };

    try {
      const response = await fetch(vnpApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Mã '00' là thành công, tuy nhiên tiền có thể mất 1-3 ngày để về tài khoản khách
      if (result.vnp_ResponseCode === '00') {
        return {
          success: true,
          message: 'Yêu cầu hoàn tiền thành công',
          raw: result,
        };
      } else {
        return {
          success: false,
          message: `VNPay từ chối hoàn tiền (Code: ${result.vnp_ResponseCode})`,
          raw: result,
        };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
