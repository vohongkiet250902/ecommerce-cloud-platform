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

  // Chạy mỗi phút 1 lần để check đơn hết hạn
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    const expiredOrders = await this.orderModel.find({
      paymentMethod: 'vnpay',
      paymentStatus: { $in: ['pending', 'unpaid'] },
      status: 'pending',
      expiresAt: { $lt: new Date() },
    });

    if (expiredOrders.length > 0) {
      this.logger.log(
        `Found ${expiredOrders.length} expired VNPay orders. Cancelling...`,
      );
    }

    for (const order of expiredOrders) {
      try {
        // Dùng updateStatus với source = 'system' để bypass validation của user/admin
        await this.ordersService.updateStatus(
          String(order._id),
          { status: 'cancelled' },
          'system',
        );
        this.logger.log(
          `[Auto-Cancel] Successfully cancelled & released stock for order ${order._id}`,
        );
      } catch (error: any) {
        this.logger.error(
          `[Auto-Cancel] Failed to cancel order ${order._id}: ${error.message}`,
        );
      }
    }
  }
}
