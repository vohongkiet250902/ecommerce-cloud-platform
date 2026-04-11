import { Controller, Post } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('admin/search-reindex')
export class SearchReindexController {
  constructor(private readonly searchService: SearchService) {}

  // API dùng để trigger việc đồng bộ lại toàn bộ sản phẩm vào Search Engine
  @Post('sync-all')
  reindexAll() {
    // Giả định bạn có một hàm syncAllProducts trong searchService
    //await this.searchService.syncAllProducts();
    return {
      message: 'Reindex process started successfully',
    };
  }
}
