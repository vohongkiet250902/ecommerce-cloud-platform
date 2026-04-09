import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { BrandsService } from './brands.service';

@Controller('brands')
@UseInterceptors(CacheInterceptor)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @CacheKey('brands_public_list')
  @CacheTTL(12 * 60 * 60 * 1000) // 12 tiếng
  findAll() {
    return this.brandsService.findAllWithCounts();
  }
}
