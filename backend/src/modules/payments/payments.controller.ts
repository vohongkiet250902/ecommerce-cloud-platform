import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import type { Response, Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('vnpay/create')
  @UseGuards(JwtGuard)
  create(
    @Body('orderId') orderId: string,
    @Req() req: Request & { user: any },
  ) {
    const ipAddr = req.ip || '127.0.0.1';
    return this.paymentsService.createVNPayUrl(orderId, req.user.id, ipAddr);
  }

  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const shouldAutoHandleIpn =
      process.env.NODE_ENV !== 'production' &&
      process.env.VNPAY_AUTO_IPN_ON_RETURN !== 'false';

    if (shouldAutoHandleIpn) {
      await this.paymentsService.handleVnPayIpn(query);
    }

    const result = await this.paymentsService.checkReturnUrl(query);

    if (result.success) {
      return res.redirect(
        `http://localhost:3000/payment-result?status=success&orderId=${result.orderId}`,
      );
    } else {
      return res.redirect(
        `http://localhost:3000/payment-result?status=failed&message=${result.message}`,
      );
    }
  }

  @SkipThrottle()
  @Get('vnpay/ipn')
  async vnpayIpn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentsService.handleVnPayIpn(query);
    return res.status(200).json(result);
  }
}
