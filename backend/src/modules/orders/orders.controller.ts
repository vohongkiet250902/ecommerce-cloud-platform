import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtGuard)
  cancel(@Param('id') id: string, @Req() req) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }

  @Get('me')
  getMyOrders(@Req() req) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  getMyOrderDetail(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOneByUser(id, req.user.id);
  }
}
