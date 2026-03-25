import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Controller('webhooks/ghn')
export class GhnWebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('order-status')
  async handleOrderStatus(@Body() body: any) {
    try {
      const order = await this.ordersService.handleGhnWebhook(body);

      return {
        ok: true,
        orderId: order?._id || null,
      };
    } catch (error: any) {
      // Luôn trả 200 để GHN không retry vô hạn trong lúc demo
      return {
        ok: false,
        message: error?.message || 'Ignored',
      };
    }
  }
}
