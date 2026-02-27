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

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('vnpay/create')
  @UseGuards(JwtGuard)
  create(
    @Body('orderId') orderId: string,
    @Req() req: Request & { user: any },
  ) {
    // Lấy IP trực tiếp từ request, fallback về localhost nếu không có
    const ipAddr = req.ip || '127.0.0.1';
    return this.paymentsService.createVNPayUrl(orderId, req.user.id, ipAddr);
  }

  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    // MẸO LOCAL TEST: Ép server tự chạy hàm IPN để update Database ngay tại đây
    // (Vì VNPAY không thể tự gọi ngầm vào localhost được)
    await this.paymentsService.handleVnPayIpn(query);

    // Sau khi DB đã được update, chạy hàm check để lấy kết quả hiển thị cho Frontend
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

  // Endpoint 2: VNPay gọi ngầm để update Database (IPN)
  @Get('vnpay/ipn')
  async vnpayIpn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentsService.handleVnPayIpn(query);
    return res.status(200).json(result);
  }
}
