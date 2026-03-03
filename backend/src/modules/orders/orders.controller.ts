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
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

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
    return this.ordersService.cancelOrder(id, req.user.id);
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

  // Trong OrdersController
  @Post(':id/retry-payment')
  async retryPayment(
    @Param('id') orderId: string,
    @Req() req,
    @Ip() ipAddr: string, // Bổ sung decorator @Ip() từ @nestjs/common
  ) {
    // 1. Kiểm tra đơn hàng có hợp lệ để thanh toán lại không
    const order = await this.ordersService.retryPayment(orderId, req.user.id);

    // 2. Nhờ PaymentService tạo link VNPay mới tinh
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
}
