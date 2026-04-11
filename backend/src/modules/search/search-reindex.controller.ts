import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SearchService } from './search.service';

@Controller('admin/search-analytics')
@UseInterceptors(CacheInterceptor) // ✅ Bật Cache cho toàn bộ các API trong Controller này
export class SearchAdminController {
  constructor(private readonly searchService: SearchService) {}

  @CacheTTL(5 * 60 * 1000) // ✅ Cache kết quả trong 5 phút (300.000 ms)
  @Get('top-queries')
  top(@Query('days') days = '7', @Query('limit') limit = '20') {
    return this.searchService.topQueries(Number(days), Number(limit));
  }

  @CacheTTL(5 * 60 * 1000)
  @Get('no-result')
  noResult(@Query('days') days = '7', @Query('limit') limit = '20') {
    return this.searchService.noResultQueries(Number(days), Number(limit));
  }

  @CacheTTL(5 * 60 * 1000)
  @Get('ctr')
  ctr(@Query('days') days = '7') {
    return this.searchService.ctr(Number(days));
  }

  @CacheTTL(5 * 60 * 1000)
  @Get('no-result-rate')
  noResultRate(@Query('days') days = '7') {
    return this.searchService.noResultRate(Number(days));
  }

  @CacheTTL(5 * 60 * 1000)
  @Get('ctr-by-query')
  ctrByQuery(@Query('days') days = '7', @Query('limit') limit = '20') {
    return this.searchService.ctrByQuery(Number(days), Number(limit));
  }

  @CacheTTL(5 * 60 * 1000)
  @Get('top-queries-daily')
  topDaily(
    @Query('days') days = '7',
    @Query('limitPerDay') limitPerDay = '10',
  ) {
    return this.searchService.topQueriesDaily(
      Number(days),
      Number(limitPerDay),
    );
  }

  @CacheTTL(5 * 60 * 1000)
  @Get('latency')
  latency(@Query('days') days = '7') {
    return this.searchService.avgLatency(Number(days));
  }
}
