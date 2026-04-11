import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schemas/order.schema';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCron {
  private readonly logger = new Logger(OrdersCron.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    const expiredOrders = await this.orderModel
      .find({
        paymentMethod: 'vnpay',
        paymentStatus: { $in: ['pending', 'unpaid'] },
        status: 'pending',
        expiresAt: { $lt: new Date() },
      })
      .lean(); // 🔥 Thêm .lean() để tăng tốc vì ta chỉ cần đọc _id

    if (!expiredOrders.length) return;

    this.logger.log(
      `Found ${expiredOrders.length} expired VNPay orders. Cancelling...`,
    );

    // 🔥 Chạy song song không gây block Event Loop của Node.js
    const promises = expiredOrders.map((order) =>
      this.ordersService
        .updateStatus(String(order._id), { status: 'cancelled' }, 'system')
        .then(() => this.logger.log(`[Auto-Cancel] Success: ${order._id}`))
        .catch((err) =>
          this.logger.error(
            `[Auto-Cancel] Failed: ${order._id} - ${err.message}`,
          ),
        ),
    );

    await Promise.allSettled(promises);
  }
}
