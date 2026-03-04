import { Controller, Post, Query } from '@nestjs/common';
import { SearchService } from './search.service';

/**
 * ✅ P0: Reindex pipeline “đúng chất search engine”
 * POST /admin/search/reindex-products?batchSize=500&purge=true&onlyActive=false
 */
@Controller('admin/search')
export class SearchReindexController {
  constructor(private readonly searchService: SearchService) {}

  @Post('reindex-products')
  reindexProducts(
    @Query('batchSize') batchSize = '500',
    @Query('purge') purge = 'true',
    @Query('onlyActive') onlyActive = 'false',
  ) {
    return this.searchService.reindexProducts({
      batchSize: Number(batchSize),
      purge: String(purge).toLowerCase() !== 'false',
      onlyActive: String(onlyActive).toLowerCase() === 'true',
    });
  }
}
