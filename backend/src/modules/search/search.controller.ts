import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * ✅ v2: /search/products?q=iphone&page=1&limit=20&minPrice=...&maxPrice=...&attributes=color:black,storage:128gb&sort=minPrice:asc
   */
  @Get('products')
  async searchProducts(@Query() query: any) {
    const q = (query.q ?? query.keyword ?? '').toString();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const categoryId = query.categoryId ? String(query.categoryId) : undefined;
    const brandId = query.brandId ? String(query.brandId) : undefined;

    const inStock =
      query.inStock === undefined
        ? undefined
        : String(query.inStock).toLowerCase() === 'true';

    const minPrice =
      query.minPrice !== undefined ? Number(query.minPrice) : undefined;
    const maxPrice =
      query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;

    const attributes = query.attributes ? String(query.attributes) : undefined;
    const sort = query.sort ? String(query.sort) : undefined;

    const facets =
      query.facets === undefined
        ? true
        : String(query.facets).toLowerCase() !== 'false';

    const facetLabels =
      query.facetLabels === undefined
        ? true
        : String(query.facetLabels).toLowerCase() !== 'false';

    // optional analytics (demo): userId/sessionId nếu bạn có auth middleware thì lấy từ req.user / header
    const userId = query.userId ? String(query.userId) : undefined;
    const sessionId = query.sessionId ? String(query.sessionId) : undefined;

    return this.searchService.searchProductsV2({
      q,
      page,
      limit,
      categoryId,
      brandId,
      inStock,
      minPrice,
      maxPrice,
      attributes,
      sort: sort as any,
      facets,
      facetLabels,
      userId,
      sessionId,
    });
  }

  /** ✅ /search/suggest?q=ip */
  @Get('suggest')
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }

  /**
   * ✅ click log
   * POST /search/events/click
   * { productId, queryId, position, q? }
   */
  @Post('events/click')
  async click(@Body() body: any) {
    return this.searchService.logClick({
      productId: String(body.productId),
      queryId: body.queryId ? String(body.queryId) : undefined,
      q: body.q ? String(body.q) : undefined,
      position: body.position !== undefined ? Number(body.position) : undefined,
      userId: body.userId ? String(body.userId) : undefined,
      sessionId: body.sessionId ? String(body.sessionId) : undefined,
    });
  }
}
