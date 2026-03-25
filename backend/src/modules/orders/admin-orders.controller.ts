import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { OrdersService } from './orders.service';
import { SimulateGhnStatusDto } from './dto/simulate-ghn-status.dto';

/**
 * Admin Orders Controller
 *
 * Thiết kế: trạng thái đơn hàng được drive bởi GHN webhook.
 * Admin KHÔNG set status thủ công qua PATCH — thay vào đó dùng:
 *   POST :id/shipping/ghn/simulate-status  → simulate bất kỳ GHN status nào
 *   POST :id/shipping/ghn/sync             → sync status thật từ GHN API
 *
 * Các action admin được phép thực hiện trực tiếp:
 *   POST :id/cancel   → hủy đơn (mọi trạng thái chưa kết thúc)
 *   POST :id/confirm  → xác nhận đơn thủ công (pending → confirmed)
 *   POST :id/complete → hoàn thành đơn thủ công (delivered → completed)
 */
@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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

  // ── Direct admin actions ────────────────────────────────────

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ordersService.adminCancelOrder(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.ordersService.adminConfirmOrder(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.ordersService.adminCompleteOrder(id);
  }

  // ── GHN shipment management ────────────────────────────────

  @Post(':id/shipping/ghn/create')
  createGhnShipment(@Param('id') id: string) {
    return this.ordersService.createGhnShipment(id);
  }

  @Post(':id/shipping/ghn/sync')
  syncGhnShipment(@Param('id') id: string) {
    return this.ordersService.syncGhnShipment(id);
  }

  @Get(':id/shipping/ghn/detail')
  getGhnDetail(@Param('id') id: string) {
    return this.ordersService.getGhnShipmentDetail(id);
  }

  @Post(':id/shipping/ghn/simulate-status')
  simulateGhnStatus(
    @Param('id') id: string,
    @Body() body: SimulateGhnStatusDto,
  ) {
    return this.ordersService.simulateGhnStatus(id, body.status, body.type);
  }

  // ── Analytics ──────────────────────────────────────────────

  @Get('stats/products-sold-by-day')
  getProductsSoldByDay(@Query('days') days?: string) {
    return this.ordersService.getProductsSoldByDay(days ? Number(days) : 7);
  }

  @Get('stats/revenue')
  getRevenueStats(
    @Query('groupBy') groupBy?: string,
    @Query('days') days?: string,
    @Query('weeks') weeks?: string,
    @Query('months') months?: string,
  ) {
    return this.ordersService.getRevenueStats((groupBy as any) || 'day', {
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
    });
  }

  @Get('stats/profit')
  getProfitStats(
    @Query('groupBy') groupBy?: string,
    @Query('days') days?: string,
    @Query('weeks') weeks?: string,
    @Query('months') months?: string,
  ) {
    return this.ordersService.getProfitStats((groupBy as any) || 'day', {
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
    });
  }

  @Get('stats/top-skus')
  getTopSkus(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.ordersService.getTopSkus(
      days ? Number(days) : 30,
      limit ? Number(limit) : 10,
      (sortBy as any) || 'quantity',
    );
  }

  @Get('stats/top-products')
  getTopProducts(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.ordersService.getTopProducts(
      days ? Number(days) : 30,
      limit ? Number(limit) : 10,
      (sortBy as any) || 'quantity',
    );
  }
}
