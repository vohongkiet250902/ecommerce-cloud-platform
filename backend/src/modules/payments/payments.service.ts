import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../orders/schemas/order.schema';
import * as crypto from 'crypto';
import * as qs from 'qs';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
  ) {}

  async createVNPayUrl(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
      status: 'pending',
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const params: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNP_TMNCODE,
      vnp_Amount: order.totalAmount * 100,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order._id.toString(),
      vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: this.formatDate(new Date()),

      // 🔥 QUAN TRỌNG
      vnp_BankCode: 'VNPAYQR',
    };

    const sorted = this.sortObject(params);
    const signData = qs.stringify(sorted, { encode: false });

    const VNP_HASHSECRET = process.env.VNP_HASHSECRET as string;

    if (!VNP_HASHSECRET) {
      throw new Error('VNP_HASHSECRET is not defined');
    }

    const hmac = crypto.createHmac('sha512', VNP_HASHSECRET);

    const secureHash = hmac
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    sorted.vnp_SecureHash = secureHash;

    const paymentUrl =
      process.env.VNP_URL + '?' + qs.stringify(sorted, { encode: false });

    return { paymentUrl };
  }

  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = obj[key];
      });
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
