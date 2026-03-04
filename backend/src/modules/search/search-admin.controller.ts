import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('admin/search-analytics')
export class SearchAdminController {
  constructor(private readonly searchService: SearchService) {}

  @Get('top-queries')
  top(@Query('days') days = '7', @Query('limit') limit = '20') {
    return this.searchService.topQueries(Number(days), Number(limit));
  }

  @Get('no-result')
  noResult(@Query('days') days = '7', @Query('limit') limit = '20') {
    return this.searchService.noResultQueries(Number(days), Number(limit));
  }

  @Get('ctr')
  ctr(@Query('days') days = '7') {
    return this.searchService.ctr(Number(days));
  }

  // ✅ P0: no-result rate
  @Get('no-result-rate')
  noResultRate(@Query('days') days = '7') {
    return this.searchService.noResultRate(Number(days));
  }

  // ✅ P0: CTR theo query
  @Get('ctr-by-query')
  ctrByQuery(@Query('days') days = '7', @Query('limit') limit = '20') {
    return this.searchService.ctrByQuery(Number(days), Number(limit));
  }

  // ✅ P0: top queries theo ngày (trend)
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

  @Get('latency')
  latency(@Query('days') days = '7') {
    return this.searchService.avgLatency(Number(days));
  }
}
