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
import type { Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('vnpay/create')
  @UseGuards(JwtGuard)
  create(@Body('orderId') orderId: string, @Req() req) {
    return this.paymentsService.createVNPayUrl(orderId, req.user.id);
  }

  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const secureHash = query.vnp_SecureHash;
    delete query.vnp_SecureHash;
    delete query.vnp_SecureHashType;

    const sorted = this.paymentsService['sortObject'](query);
    const signData = require('qs').stringify(sorted, { encode: false });

    const hmac = require('crypto').createHmac(
      'sha512',
      process.env.VNP_HASHSECRET,
    );
    const checkHash = hmac.update(signData).digest('hex');

    if (secureHash !== checkHash) {
      return res.status(400).send('Invalid signature');
    }

    if (query.vnp_ResponseCode === '00') {
      await this.paymentsService['orderModel'].findByIdAndUpdate(
        query.vnp_TxnRef,
        { status: 'paid', paymentMethod: 'vnpay' },
      );
    }

    return res.redirect('http://localhost:3000/payment-result');
  }
}
