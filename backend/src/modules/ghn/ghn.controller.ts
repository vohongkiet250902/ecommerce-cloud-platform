import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GhnService } from './ghn.service';

@Controller('shipping/ghn')
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

  @Get('provinces')
  getProvinces() {
    return this.ghnService.getProvinces();
  }

  @Get('districts')
  getDistricts(@Query('provinceId') provinceId?: string) {
    const id = Number(provinceId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('provinceId không hợp lệ');
    }
    return this.ghnService.getDistricts(id);
  }

  @Get('wards')
  getWards(@Query('districtId') districtId?: string) {
    const id = Number(districtId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('districtId không hợp lệ');
    }
    return this.ghnService.getWards(id);
  }

  @Get('services')
  getServices(@Query('toDistrictId') toDistrictId?: string) {
    const id = Number(toDistrictId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('toDistrictId không hợp lệ');
    }
    return this.ghnService.getAvailableServices(id);
  }
}
