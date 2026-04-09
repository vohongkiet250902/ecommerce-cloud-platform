import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { GhnService } from './ghn.service';

@Controller('shipping/ghn')
@UseInterceptors(CacheInterceptor)
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

  @Get('provinces')
  @CacheKey('ghn:provinces')
  @CacheTTL(86400 * 1000)
  getProvinces() {
    return this.ghnService.getProvinces();
  }

  @Get('districts')
  @CacheTTL(86400 * 1000)
  getDistricts(@Query('provinceId') provinceId?: string) {
    const id = Number(provinceId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('provinceId không hợp lệ');
    }
    return this.ghnService.getDistricts(id);
  }

  @Get('wards')
  @CacheTTL(86400 * 1000)
  getWards(@Query('districtId') districtId?: string) {
    const id = Number(districtId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('districtId không hợp lệ');
    }
    return this.ghnService.getWards(id);
  }

  @Get('services')
  @CacheTTL(60 * 1000)
  getServices(@Query('toDistrictId') toDistrictId?: string) {
    const id = Number(toDistrictId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('toDistrictId không hợp lệ');
    }
    return this.ghnService.getAvailableServices(id);
  }
}
