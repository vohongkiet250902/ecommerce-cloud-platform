import { Body, Controller, Post, HttpCode, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as crypto from 'crypto'; // 🔥 Import crypto
import { OrdersShippingService } from './orders-shipping.service'; // 🔥 Đổi Import

@SkipThrottle()
@Controller('webhooks/ghn')
export class GhnWebhookController {
  // 🔥 Inject OrdersShippingService thay vì OrdersService
  constructor(private readonly shippingService: OrdersShippingService) {}

  @Post('order-status')
  @HttpCode(200)
  async handleOrderStatus(
    @Body() body: any,
    @Headers('Token') ghnToken?: string,
  ) {
    const secret = process.env.GHN_WEBHOOK_SECRET || '';

    if (secret) {
      const tokenBuffer = Buffer.from(ghnToken || '');
      const secretBuffer = Buffer.from(secret);

      // 🔥 Ngăn chặn Timing Attack bằng timingSafeEqual
      const isValidToken =
        tokenBuffer.length === secretBuffer.length &&
        crypto.timingSafeEqual(tokenBuffer, secretBuffer);

      if (!isValidToken) {
        return { ok: false, message: 'Unauthorized' };
      }
    }

    try {
      // 🔥 Gọi shippingService
      const order = await this.shippingService.handleGhnWebhook(body);
      return {
        ok: true,
        orderId: order?._id || null,
      };
    } catch (error: any) {
      // 🔥 Ẩn lỗi nội bộ khỏi Webhook response
      return {
        ok: false,
        message: 'Webhook processing failed',
      };
    }
  }
}
