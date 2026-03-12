import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SearchService } from './search.service';

type AttributeFilters = Record<string, string[]>;

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  private splitMultiValue(input: any): string[] {
    if (Array.isArray(input)) {
      return input.flatMap((x) => this.splitMultiValue(x)).filter(Boolean);
    }

    return String(input ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  private parseAttributeFilters(query: any): AttributeFilters | undefined {
    const out: AttributeFilters = {};

    const push = (rawKey: any, rawValue: any) => {
      const key = String(rawKey ?? '').trim();
      if (!key) return;

      const values = this.splitMultiValue(rawValue);
      if (values.length === 0) return;

      out[key] = Array.from(new Set([...(out[key] ?? []), ...values]));
    };

    if (
      query.attributes &&
      typeof query.attributes === 'object' &&
      !Array.isArray(query.attributes)
    ) {
      for (const [k, v] of Object.entries(query.attributes)) {
        push(k, v);
      }
    }

    if (typeof query.attributes === 'string') {
      const segments = String(query.attributes)
        .split(';')
        .map((x) => x.trim())
        .filter(Boolean);

      for (const segment of segments) {
        const idx = segment.indexOf(':');
        if (idx <= 0) continue;

        const key = segment.slice(0, idx).trim();
        const value = segment.slice(idx + 1).trim();
        push(key, value);
      }
    }

    for (const [k, v] of Object.entries(query)) {
      const bracketMatch = k.match(/^attributes\[(.+)\]$/i);
      if (bracketMatch) {
        push(bracketMatch[1], v);
        continue;
      }

      const flatMatch = k.match(/^attr(?:ibute)?_(.+)$/i);
      if (flatMatch) {
        push(flatMatch[1], v);
      }
    }

    return Object.keys(out).length > 0 ? out : undefined;
  }

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

    const sort = query.sort ? String(query.sort) : undefined;

    const facets =
      query.facets === undefined
        ? true
        : String(query.facets).toLowerCase() !== 'false';

    const facetLabels =
      query.facetLabels === undefined
        ? true
        : String(query.facetLabels).toLowerCase() !== 'false';

    const userId = query.userId ? String(query.userId) : undefined;
    const sessionId = query.sessionId ? String(query.sessionId) : undefined;

    const attributes = this.parseAttributeFilters(query);

    return this.searchService.searchProductsV2({
      q,
      page,
      limit,
      categoryId,
      brandId,
      inStock,
      minPrice,
      maxPrice,
      sort: sort as any,
      facets,
      facetLabels,
      userId,
      sessionId,
      attributes,
    });
  }

  @Get('suggest')
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }

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

  @Get('debug/retrieve-for-ai')
  async retrieveForAi(@Query('message') message: string) {
    return this.searchService.retrieveForAi({ message, limit: 5 });
  }
}
