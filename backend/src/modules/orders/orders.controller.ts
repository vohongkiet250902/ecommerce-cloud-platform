import { PaymentsService } from './../payments/payments.service';
import {
  Body,
  Controller,
  forwardRef,
  Get,
  Headers,
  Inject,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, PreviewOrderDto } from './dto/create-order.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    default: { limit: 5, ttl: 60000 },
  })
  @Post()
  create(
    @Req() req,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(req.user.id, { ...dto, idempotencyKey });
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req) {
    return this.ordersService.userCancelOrder(id, req.user.id);
  }

  @Patch(':id/confirm-received')
  confirmReceived(@Param('id') id: string, @Req() req) {
    return this.ordersService.confirmReceived(id, req.user.id);
  }

  @Patch(':id/report-not-received')
  reportNotReceived(@Param('id') id: string, @Req() req) {
    return this.ordersService.reportNotReceived(id, req.user.id);
  }

  @Patch(':id/return')
  returnOrder(@Param('id') id: string, @Req() req) {
    return this.ordersService.returnOrder(id, req.user.id);
  }

  @Get('me')
  getMyOrders(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findByUser(req.user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
    });
  }

  @Get(':id')
  getMyOrderDetail(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOneByUser(id, req.user.id);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post(':id/retry-payment')
  async retryPayment(
    @Param('id') orderId: string,
    @Req() req,
    @Ip() ipAddr: string,
  ) {
    const order = await this.ordersService.retryPayment(orderId, req.user.id);
    const result = await this.paymentsService.createVNPayUrl(
      order._id.toString(),
      req.user.id,
      ipAddr || '127.0.0.1',
    );

    return {
      message: 'Tạo link thanh toán mới thành công',
      paymentUrl: result.paymentUrl,
    };
  }

  @Post('preview')
  preview(@Body() dto: PreviewOrderDto) {
    return this.ordersService.previewOrder(dto);
  }
}
