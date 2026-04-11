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
import { OrdersAnalyticsService } from './orders-analytics.service';
import { OrdersShippingService } from './orders-shipping.service';

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly analyticsService: OrdersAnalyticsService, // 🔥 Sửa lại private readonly
    private readonly shippingService: OrdersShippingService, // 🔥 Sửa lại private readonly
  ) {}

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

  // ── Direct admin actions (Vẫn dùng OrdersService) ─────────────────────────

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

  // ── GHN shipment management (ĐỔI SANG shippingService) ───────────────────

  @Post(':id/shipping/ghn/create')
  createGhnShipment(@Param('id') id: string) {
    return this.shippingService.createGhnShipment(id); // 🔥 Đã đổi
  }

  @Post('shipping/ghn/sync-all')
  syncAllGhnShipments() {
    return this.shippingService.syncAllActiveGhnShipments(); // 🔥 Đã đổi
  }

  @Post(':id/shipping/ghn/sync')
  syncGhnShipment(@Param('id') id: string) {
    return this.shippingService.syncGhnShipment(id);
  }

  @Get(':id/shipping/ghn/detail')
  getGhnDetail(@Param('id') id: string) {
    return this.shippingService.getGhnShipmentDetail(id); // 🔥 Đã đổi
  }

  @Post(':id/shipping/ghn/simulate-status')
  simulateGhnStatus(
    @Param('id') id: string,
    @Body() body: SimulateGhnStatusDto,
  ) {
    return this.shippingService.simulateGhnStatus(id, body.status, body.type); // 🔥 Đã đổi
  }

  // ── Analytics (ĐỔI SANG analyticsService) ────────────────────────────────

  @Get('stats/products-sold-by-day')
  getProductsSoldByDay(@Query('days') days?: string) {
    return this.analyticsService.getProductsSoldByDay(days ? Number(days) : 7); // 🔥 Đã đổi
  }

  @Get('stats/revenue')
  getRevenueStats(
    @Query('groupBy') groupBy?: string,
    @Query('days') days?: string,
    @Query('weeks') weeks?: string,
    @Query('months') months?: string,
    @Query('quarters') quarters?: string,
  ) {
    return this.analyticsService.getRevenueStats((groupBy as any) || 'day', {
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
      quarters: quarters ? Number(quarters) : undefined,
    });
  }

  @Get('stats/profit')
  getProfitStats(
    @Query('groupBy') groupBy?: string,
    @Query('days') days?: string,
    @Query('weeks') weeks?: string,
    @Query('months') months?: string,
    @Query('quarters') quarters?: string,
  ) {
    return this.analyticsService.getProfitStats((groupBy as any) || 'day', {
      // 🔥 Đã đổi
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
      quarters: quarters ? Number(quarters) : undefined,
    });
  }

  @Get('stats/top-skus')
  getTopSkus(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.analyticsService.getTopSkus(
      // 🔥 Đã đổi
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
    return this.analyticsService.getTopProducts(
      // 🔥 Đã đổi
      days ? Number(days) : 30,
      limit ? Number(limit) : 10,
      (sortBy as any) || 'quantity',
    );
  }
}
