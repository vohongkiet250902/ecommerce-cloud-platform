import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30 * 1000)
  @Get()
  findAll(@Query() query: any) {
    return this.productsService.findAll(query, false);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 1000)
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
