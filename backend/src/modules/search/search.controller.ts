import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // API dành cho User tìm kiếm sản phẩm
  // URL mẫu: GET /search/products?keyword=iphone&limit=10
  @Get('products')
  async searchProducts(
    @Query('keyword') keyword: string,
    @Query('limit') limit: string,
  ) {
    // Nếu khách không gõ gì thì trả về mảng rỗng
    if (!keyword || keyword.trim() === '') {
      return { hits: [] };
    }

    const searchLimit = limit ? parseInt(limit, 10) : 10;

    // Gọi sang SearchService để chọc vào Meilisearch
    return this.searchService.searchProducts(keyword, searchLimit);
  }
}
