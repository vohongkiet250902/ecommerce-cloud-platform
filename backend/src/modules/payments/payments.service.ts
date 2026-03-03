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
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    private configService: ConfigService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async createVNPayUrl(orderId: string, userId: string, ipAddr: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
      status: 'pending',
    });

    if (!order) {
      throw new BadRequestException('Order not found or already paid');
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

    // BƯỚC QUAN TRỌNG 1: Dùng hàm sort chuẩn của VNPay
    vnp_Params = this.sortObject(vnp_Params);

    // BƯỚC QUAN TRỌNG 2: Tắt encode của qs vì sortObject đã làm rồi
    const signData = qs.stringify(vnp_Params, { encode: false });

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    // BƯỚC QUAN TRỌNG 3: Nối chuỗi URL (vẫn tắt encode)
    const finalUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });

    return { paymentUrl: finalUrl };
  }

  // 1. Cập nhật hàm checkReturnUrl
  async checkReturnUrl(query: any) {
    // BẮT BUỘC: Clone object để cắt đứt liên kết với req.query gốc của NestJS
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

  // 2. Cập nhật hàm handleVnPayIpn
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

    if (secureHash === signed) {
      const orderId = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];

      const order = await this.orderModel.findById(orderId);
      if (!order) return { RspCode: '01', Message: 'Order not found' };

      if (order.status !== 'pending' && order.paymentStatus === 'paid') {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      if (responseCode === '00') {
        // Thanh toán thành công
        await this.ordersService.updateStatus(orderId, {
          status: 'paid',
          paymentStatus: 'paid',
        });
      } else {
        // Thanh toán thất bại hoặc khách hủy
        // CHUẨN XÁC: Gọi hàm handlePaymentFailed để cập nhật trạng thái chờ
        await this.ordersService.handlePaymentFailed(orderId);
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    } else {
      return { RspCode: '97', Message: 'Invalid signature' };
    }
  }

  // 3. Sửa lỗi chí mạng trong hàm sortObject
  private sortObject(obj: any): Record<string, string> {
    let sorted: Record<string, string> = {};
    let str: string[] = [];
    let key;
    for (key in obj) {
      // SỬA Ở ĐÂY: Dùng Object.prototype.hasOwnProperty.call để tránh crash với object không prototype
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
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
}
