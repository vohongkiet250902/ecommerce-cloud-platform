import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { OrdersService } from './orders.service';

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ✅ Đã thêm lại Phân trang và Lọc
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.ordersService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
      status,
      userId,
    });
  }

  // Cho phép update cả trạng thái giao hàng và thanh toán
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string; paymentStatus?: string },
  ) {
    return this.ordersService.updateStatus(id, body);
  }

  // API riêng để Hủy đơn + Hoàn kho
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ordersService.adminCancelOrder(id);
  }
}
