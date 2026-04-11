import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('receipts')
  stockIn(@Body() dto: StockInDto) {
    return this.inventoryService.stockIn(dto);
  }

  @Get('lots')
  listLots(
    @Query('productId') productId?: string, 
    @Query('sku') sku?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('excludeOpening') excludeOpening?: string,
  ) {
    return this.inventoryService.listLots(productId, sku, {
      startDate,
      endDate,
      excludeOpening: excludeOpening === 'true',
    });
  }

  @Get('stats/stock-in')
  getStockInStats(
    @Query('groupBy') groupBy?: string,
    @Query('days') days?: string,
    @Query('weeks') weeks?: string,
    @Query('months') months?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getStockInStats((groupBy as any) || 'day', {
      days: days ? Number(days) : undefined,
      weeks: weeks ? Number(weeks) : undefined,
      months: months ? Number(months) : undefined,
      startDate,
      endDate,
    });
  }
}
