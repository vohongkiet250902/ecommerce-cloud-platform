import { Body, Controller, Post, HttpCode, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';

@SkipThrottle()
@Controller('webhooks/ghn')
export class GhnWebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('order-status')
  @HttpCode(200)
  async handleOrderStatus(
    @Body() body: any,
    @Headers('Token') ghnToken?: string,
  ) {
    if (
      process.env.GHN_WEBHOOK_SECRET &&
      ghnToken !== process.env.GHN_WEBHOOK_SECRET
    ) {
      return { ok: false, message: 'Invalid token' };
    }

    try {
      const order = await this.ordersService.handleGhnWebhook(body);
      return {
        ok: true,
        orderId: order?._id || null,
      };
    } catch (error: any) {
      return {
        ok: false,
        message: error?.message || 'Ignored',
      };
    }
  }
}
