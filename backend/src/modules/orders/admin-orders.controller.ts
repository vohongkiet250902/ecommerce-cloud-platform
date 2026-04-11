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

  @Post(':id/shipping/ghn/create')
  createGhnShipment(@Param('id') id: string) {
    return this.ordersService.createGhnShipment(id);
  }

  @Post('shipping/ghn/sync-all')
  syncAllGhnShipments() {
    return this.ordersService.syncAllActiveGhnShipments();
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
    @Query('quarters') quarters?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getRevenueStats((groupBy as any) || 'day', {
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
      quarters: quarters ? Number(quarters) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('stats/profit')
  getProfitStats(
    @Query('groupBy') groupBy?: string,
    @Query('days') days?: string,
    @Query('weeks') weeks?: string,
    @Query('months') months?: string,
    @Query('quarters') quarters?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getProfitStats((groupBy as any) || 'day', {
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
      quarters: quarters ? Number(quarters) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('stats/top-skus')
  getTopSkus(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getTopSkus(
      days ? Number(days) : 30,
      limit ? Number(limit) : 10,
      (sortBy as any) || 'quantity',
      { startDate, endDate },
    );
  }

  @Get('stats/top-products')
  getTopProducts(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getTopProducts(
      days ? Number(days) : 30,
      limit ? Number(limit) : 10,
      (sortBy as any) || 'quantity',
      { startDate, endDate },
    );
  }
}
