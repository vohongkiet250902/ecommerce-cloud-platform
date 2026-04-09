import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseInterceptors(CacheInterceptor) // 🔥 Kích hoạt Caching
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @CacheKey('categories_public_list') // 🔥 Tên key lưu trong Redis
  @CacheTTL(12 * 60 * 60 * 1000) // 🔥 Thời gian sống (TTL): 12 tiếng (NestJS v5 dùng millisecond)
  findAll() {
    return this.categoriesService.findAll();
  }
}
