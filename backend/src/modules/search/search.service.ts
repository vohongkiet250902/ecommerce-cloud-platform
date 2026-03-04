import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { SearchLog, SearchLogDocument } from './schemas/search-log.schema';
import { ClickLog, ClickLogDocument } from './schemas/click-log.schema';

// ⬇️ dùng cho reindex + facet labels
import { Product } from '../products/schemas/product.schema';
import { Brand } from '../brands/schemas/brand.schema';
import { Category } from '../categories/schemas/category.schema';

type SearchSort =
  | 'minPrice:asc'
  | 'minPrice:desc'
  | 'createdAt:desc'
  | 'rating:desc';

export type SearchV2Params = {
  q?: string;
  page?: number;
  limit?: number;

  categoryId?: string;
  brandId?: string;
  inStock?: boolean;

  minPrice?: number;
  maxPrice?: number;

  // "color:black,storage:128gb"
  attributes?: string;

  sort?: SearchSort;
  facets?: boolean;
  facetLabels?: boolean; // map brandId/categoryId => name

  userId?: string; // optional analytics
  sessionId?: string; // optional analytics
};

type ProductSearchDoc = {
  id: string;

  name: string;
  slug: string;
  description?: string;

  categoryId?: string;
  brandId?: string;

  image?: string | null;
  images?: string[];

  minPrice: number;
  maxPrice: number;

  totalStock: number;
  inStock: boolean;

  rating: number;
  reviewCount: number;

  isFeatured: boolean;
  createdAt: number;

  // flatten để filter/facet dễ
  attributePairs: string[];
};

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch;
  private indexUid: string;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(SearchLog.name)
    private readonly searchLogModel: Model<SearchLogDocument>,
    @InjectModel(ClickLog.name)
    private readonly clickLogModel: Model<ClickLogDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {
    const host =
      this.config.get<string>('MEILI_HOST') || 'http://localhost:7700';
    const apiKey = this.config.get<string>('MEILI_API_KEY') || '';
    this.indexUid =
      this.config.get<string>('MEILI_PRODUCTS_INDEX') || 'products';

    this.client = new MeiliSearch({ host, apiKey });
  }

  private productsIndex() {
    return this.client.index<ProductSearchDoc>(this.indexUid);
  }

  private clampInt(n: any, min: number, max: number) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, Math.floor(x)));
  }

  async onModuleInit() {
    // Với meilisearch-js 0.55: API updates/tasks không đồng nhất giữa versions => không "await wait task"
    // Mục tiêu: app không crash + settings được apply async
    try {
      await this.ensureProductsIndexAndSettings();
    } catch (e: any) {
      console.error('[Meili] ensure settings failed:', e?.message ?? e);
    }
  }

  private loadSynonyms(): Record<string, string[]> {
    // Ưu tiên đọc từ file JSON để bạn dễ demo + viết report (query expansion)
    // Env gợi ý: MEILI_SYNONYMS_FILE=./synonyms.vi.json
    const envPath = this.config.get<string>('MEILI_SYNONYMS_FILE');

    const candidates = [
      envPath,
      path.resolve(process.cwd(), 'synonyms.vi.json'),
    ].filter(Boolean) as string[];

    for (const filePath of candidates) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // ignore parse errors, fallback
      }
    }

    // fallback tối thiểu (bạn có thể mở rộng trong file JSON)
    return {
      'tai nghe': ['headphone', 'earphone'],
      'ốp lưng': ['case', 'phone case'],
      sạc: ['charger', 'adapter'],
      'điện thoại': ['phone', 'smartphone'],
      iphone: ['i phone', 'ip'],
    };
  }

  /**
   * ✅ settings chuẩn: searchable/filterable/sortable/facets/synonyms/typo
   */
  private async ensureProductsIndexAndSettings() {
    // ensure index exists
    try {
      await this.client.getIndex(this.indexUid);
    } catch {
      await this.client.createIndex(this.indexUid, { primaryKey: 'id' });
    }

    await this.productsIndex().updateSettings({
      searchableAttributes: ['name', 'description', 'attributePairs', 'slug'],

      filterableAttributes: [
        'categoryId',
        'brandId',
        'inStock',
        'minPrice',
        'maxPrice',
        'rating',
        'reviewCount',
        'isFeatured',
        'attributePairs',
      ],

      sortableAttributes: [
        'minPrice',
        'createdAt',
        'rating',
        'reviewCount',
        'inStock',
        'isFeatured',
      ],

      // facetsDistribution sẽ nằm trong search response nếu bạn truyền facets
      // (Meili facets hoạt động dựa trên filterableAttributes)

      synonyms: this.loadSynonyms(),

      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      },

      stopWords: ['và', 'là', 'của', 'cho', 'với', 'một', 'các', 'những', 'từ'],
    });
  }
  // -----------------------------
  // ✅ Document normalization
  // -----------------------------
  private normalizeText(s: any): string {
    return String(s ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private computeMinMaxPrice(productData: any): {
    minPrice: number;
    maxPrice: number;
  } {
    const variants: any[] = Array.isArray(productData?.variants)
      ? productData.variants
      : [];
    const prices: number[] = [];

    for (const v of variants) {
      if (!v) continue;
      if ((v.status || 'active') !== 'active') continue;

      const rawPrice = Number(v.finalPrice ?? v.price ?? 0);
      if (!Number.isFinite(rawPrice) || rawPrice <= 0) continue;

      const discount = Number(v.discountPercentage ?? 0);
      const effectivePrice =
        v.finalPrice != null
          ? rawPrice
          : Number.isFinite(discount) && discount > 0
            ? Math.round(rawPrice * (1 - discount / 100))
            : rawPrice;

      if (Number.isFinite(effectivePrice) && effectivePrice > 0)
        prices.push(effectivePrice);
    }

    if (prices.length === 0) return { minPrice: 0, maxPrice: 0 };
    return { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
  }

  private computeTotalStock(productData: any): number {
    const totalStock = Number(productData?.totalStock ?? NaN);
    if (Number.isFinite(totalStock)) return totalStock;

    const variants: any[] = Array.isArray(productData?.variants)
      ? productData.variants
      : [];
    let sum = 0;
    for (const v of variants) {
      if (!v) continue;
      if ((v.status || 'active') !== 'active') continue;
      const s = Number(v.stock ?? 0);
      if (Number.isFinite(s) && s > 0) sum += s;
    }
    return sum;
  }

  /**
   * ✅ attributePairs = ["color:black","storage:128gb"]
   * lấy từ product.specs + variant.attributes
   */
  private buildAttributePairs(productData: any): string[] {
    const pairs = new Set<string>();

    const pushAttrs = (attrs: any[]) => {
      if (!Array.isArray(attrs)) return;
      for (const a of attrs) {
        const key = this.normalizeText(a?.key);
        const value = this.normalizeText(a?.value);
        if (!key || !value) continue;
        pairs.add(`${key}:${value}`);
      }
    };

    pushAttrs(productData?.specs);

    const variants: any[] = Array.isArray(productData?.variants)
      ? productData.variants
      : [];
    for (const v of variants) {
      if (!v) continue;
      if ((v.status || 'active') !== 'active') continue;
      pushAttrs(v?.attributes);
    }

    return Array.from(pairs);
  }

  private toSearchDoc(productData: any): ProductSearchDoc | null {
    if (!productData?._id) return null;

    // chỉ index product active để search “đúng”
    if ((productData.status || 'active') !== 'active') return null;

    const { minPrice, maxPrice } = this.computeMinMaxPrice(productData);
    const totalStock = this.computeTotalStock(productData);
    const inStock = totalStock > 0;

    const images = Array.isArray(productData?.images)
      ? productData.images.map((x: any) => x?.url).filter(Boolean)
      : [];

    const createdAt =
      productData?.createdAt instanceof Date
        ? productData.createdAt.getTime()
        : Number.isFinite(Number(productData?.createdAt))
          ? Number(productData.createdAt)
          : Date.now();

    return {
      id: productData._id.toString(),
      name: String(productData.name ?? ''),
      slug: String(productData.slug ?? ''),
      description: productData.description ?? '',
      categoryId: productData.categoryId
        ? productData.categoryId.toString()
        : undefined,
      brandId: productData.brandId ? productData.brandId.toString() : undefined,
      images,
      image: images[0] ?? null,
      minPrice,
      maxPrice,
      totalStock,
      inStock,
      rating: Number(productData.averageRating ?? 0) || 0,
      reviewCount: Number(productData.reviewCount ?? 0) || 0,
      isFeatured: Boolean(productData.isFeatured),
      createdAt,
      attributePairs: this.buildAttributePairs(productData),
    };
  }

  // -----------------------------
  // ✅ Index CRUD hooks
  // -----------------------------
  async addOrUpdateProduct(productData: any) {
    const doc = this.toSearchDoc(productData);
    if (!doc) return { ok: true, skipped: true };

    // meilisearch-js 0.55: addDocuments async, không cần wait
    return this.productsIndex().addDocuments([doc], { primaryKey: 'id' });
  }

  async removeProduct(productId: string) {
    return this.productsIndex().deleteDocument(productId);
  }

  // -----------------------------
  // ✅ P0: Reindex pipeline (Mongo -> build doc -> batch addDocuments)
  // -----------------------------
  async reindexProducts(input?: {
    batchSize?: number;
    purge?: boolean; // deleteAllDocuments trước khi add
    onlyActive?: boolean; // chỉ lấy product.status=active (nhanh hơn)
  }) {
    if (input?.batchSize != null && !Number.isFinite(Number(input.batchSize))) {
      throw new BadRequestException('batchSize must be a number');
    }
    const batchSize = this.clampInt(input?.batchSize ?? 500, 50, 2000);
    const purge = input?.purge !== false;
    const onlyActive = input?.onlyActive === true;

    // demo-friendly: purge trước để tránh “document rác” (inactive/deleted)
    if (purge) {
      await this.productsIndex().deleteAllDocuments();
    }

    const mongoFilter: any = onlyActive ? { status: 'active' } : {};
    const cursor = this.productModel
      .find(mongoFilter)
      .select({
        name: 1,
        slug: 1,
        description: 1,
        categoryId: 1,
        brandId: 1,
        images: 1,
        variants: 1,
        specs: 1,
        totalStock: 1,
        status: 1,
        isFeatured: 1,
        averageRating: 1,
        reviewCount: 1,
        createdAt: 1,
      })
      .cursor();

    let scanned = 0;
    let indexed = 0;
    let skipped = 0;
    let batches = 0;
    const errors: Array<{ id?: string; error: string }> = [];

    let buffer: ProductSearchDoc[] = [];
    const flush = async () => {
      if (!buffer.length) return;
      try {
        await this.productsIndex().addDocuments(buffer, { primaryKey: 'id' });
        indexed += buffer.length;
        batches += 1;
      } catch (e: any) {
        // best-effort: nếu batch fail, ghi nhận lỗi và tiếp
        errors.push({ error: e?.message ?? String(e) });
      } finally {
        buffer = [];
      }
    };

    for await (const p of cursor as any) {
      scanned += 1;
      try {
        const doc = this.toSearchDoc(p);
        if (!doc) {
          skipped += 1;
          continue;
        }
        buffer.push(doc);
        if (buffer.length >= batchSize) await flush();
      } catch (e: any) {
        errors.push({
          id: p?._id?.toString?.(),
          error: e?.message ?? String(e),
        });
      }
    }

    await flush();

    return {
      ok: true,
      indexUid: this.indexUid,
      purge,
      onlyActive,
      batchSize,
      scanned,
      indexed,
      skipped,
      batches,
      errors: errors.slice(0, 20), // tránh trả quá dài
    };
  }

  // -----------------------------
  // ✅ Search v2: filter/sort/paging + facets + analytics logging
  // -----------------------------
  private esc(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * price range “đúng”: overlap range
   * - user minPrice => maxPrice >= min
   * - user maxPrice => minPrice <= max
   */
  private buildMeiliFilter(
    p: SearchV2Params,
    opts?: { ignoreAttributes?: boolean },
  ): string | undefined {
    const parts: string[] = [];

    if (p.categoryId) parts.push(`categoryId = "${this.esc(p.categoryId)}"`);
    if (p.brandId) parts.push(`brandId = "${this.esc(p.brandId)}"`);
    if (typeof p.inStock === 'boolean') parts.push(`inStock = ${p.inStock}`);

    if (Number.isFinite(p.minPrice as number))
      parts.push(`maxPrice >= ${Number(p.minPrice)}`);
    if (Number.isFinite(p.maxPrice as number))
      parts.push(`minPrice <= ${Number(p.maxPrice)}`);

    if (!opts?.ignoreAttributes && p.attributes) {
      const raw = String(p.attributes)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const pair of raw) {
        const normalized = this.normalizeText(pair);
        if (!normalized.includes(':')) continue;
        parts.push(`attributePairs = "${this.esc(normalized)}"`);
      }
    }

    return parts.length ? parts.join(' AND ') : undefined;
  }

  private async mapFacetLabels(facetDistribution: any) {
    const brandFacet = facetDistribution?.brandId ?? {};
    const categoryFacet = facetDistribution?.categoryId ?? {};

    const brandIds = Object.keys(brandFacet);
    const categoryIds = Object.keys(categoryFacet);

    const [brands, categories] = await Promise.all([
      brandIds.length
        ? this.brandModel
            .find({ _id: { $in: brandIds } })
            .select({ name: 1 })
            .lean()
        : Promise.resolve([]),
      categoryIds.length
        ? this.categoryModel
            .find({ _id: { $in: categoryIds } })
            .select({ name: 1 })
            .lean()
        : Promise.resolve([]),
    ]);

    const brandId: Record<string, string> = {};
    for (const b of brands as any[]) brandId[String(b._id)] = String(b.name);

    const categoryId: Record<string, string> = {};
    for (const c of categories as any[])
      categoryId[String(c._id)] = String(c.name);

    return { brandId, categoryId };
  }

  private async suggestedQueriesByPrefix(prefix: string, limit = 5) {
    const q = this.normalizeText(prefix);
    if (!q) return [];

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // lấy query “đã từng có kết quả” để gợi ý no-result
    const rows = await this.searchLogModel.aggregate([
      {
        $match: {
          q: { $regex: `^${escaped}`, $options: 'i' },
          totalHits: { $gt: 0 },
        },
      },
      { $group: { _id: '$q', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, q: '$_id', count: 1 } },
    ]);

    return rows.map((r: any) => r.q);
  }

  private buildSort(p: SearchV2Params): string[] {
    // ranking tuning default (boost)
    if (!p.sort) {
      return [
        'inStock:desc',
        'isFeatured:desc',
        'rating:desc',
        'reviewCount:desc',
        'createdAt:desc',
      ];
    }
    const allowed = new Set<SearchSort>([
      'minPrice:asc',
      'minPrice:desc',
      'createdAt:desc',
      'rating:desc',
    ]);
    return allowed.has(p.sort)
      ? [p.sort]
      : [
          'inStock:desc',
          'isFeatured:desc',
          'rating:desc',
          'reviewCount:desc',
          'createdAt:desc',
        ];
  }

  private newQueryId(): string {
    // đủ dùng cho demo (không cần uuid lib)
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  async searchProductsV2(params: SearchV2Params) {
    const page = this.clampInt(params.page ?? 1, 1, 10_000);
    const limit = this.clampInt(params.limit ?? 20, 1, 60);
    const offset = (page - 1) * limit;

    const q = (params.q ?? '').trim();
    const filter = this.buildMeiliFilter(params);

    if (!q && !filter) {
      return {
        hits: [],
        facets: {},
        processingTimeMs: 0,
        totalHits: 0,
        page,
        limit,
      };
    }

    const queryId = this.newQueryId();
    const t0 = Date.now();

    const doSearch = (input: {
      filter?: string;
      limit?: number;
      offset?: number;
    }) =>
      this.productsIndex().search(q, {
        limit: input.limit ?? limit,
        offset: input.offset ?? offset,
        filter: input.filter,
        sort: this.buildSort(params),
        facets:
          params.facets === false
            ? undefined
            : ['brandId', 'categoryId', 'attributePairs'],
        attributesToRetrieve: [
          'id',
          'name',
          'slug',
          'image',
          'minPrice',
          'maxPrice',
          'inStock',
          'totalStock',
          'rating',
          'reviewCount',
          'brandId',
          'categoryId',
          'isFeatured',
          'createdAt',
        ],
      });
    const res: any = await doSearch({ filter });

    const latencyMs = Date.now() - t0;
    const totalHits = res.estimatedTotalHits ?? res.nbHits ?? 0;

    // ✅ Analytics: log search (best-effort)
    void this.searchLogModel.create({
      queryId,
      q,
      filters: {
        categoryId: params.categoryId,
        brandId: params.brandId,
        inStock: params.inStock,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        attributes: params.attributes,
      },
      ...(params.sort ? { sort: params.sort } : {}),
      totalHits,
      latencyMs,
      ...(res.processingTimeMs != null
        ? { processingTimeMs: res.processingTimeMs }
        : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      timestamp: new Date(),
    });

    const facets = res.facetDistribution ?? {};
    const includeFacetLabels =
      params.facets !== false && (params.facetLabels ?? true);
    const facetLabels = includeFacetLabels
      ? await this.mapFacetLabels(facets)
      : undefined;

    // ✅ P1 (nhẹ, dễ demo): no-result handling
    // 1) suggestedQueries: từ analytics (prefix)
    // 2) relaxed preview: nếu có filter attributes quá chặt -> retry bỏ attributes
    let noResult: any = undefined;
    if (totalHits === 0 && q) {
      const suggestedQueries = await this.suggestedQueriesByPrefix(q, 5);

      let relaxed: any = undefined;
      if (params.attributes) {
        const relaxedFilter = this.buildMeiliFilter(params, {
          ignoreAttributes: true,
        });
        const relaxedRes: any = await doSearch({ filter: relaxedFilter });
        const relaxedTotalHits =
          relaxedRes.estimatedTotalHits ?? relaxedRes.nbHits ?? 0;
        if (relaxedTotalHits > 0) {
          relaxed = {
            removedFilters: ['attributes'],
            totalHits: relaxedTotalHits,
            hits: (relaxedRes.hits ?? []).slice(0, 6),
          };
        }
      }

      noResult = {
        suggestedQueries,
        ...(relaxed ? { relaxed } : {}),
      };
    }

    return {
      queryId,
      hits: res.hits ?? [],
      facets,
      ...(facetLabels ? { facetLabels } : {}),
      ...(noResult ? { noResult } : {}),
      processingTimeMs: res.processingTimeMs ?? 0,
      totalHits,
      page,
      limit,
    };
  }

  // -----------------------------
  // ✅ Suggest endpoint
  // -----------------------------
  async suggest(q: string) {
    const keyword = (q ?? '').trim();
    if (!keyword) {
      return {
        querySuggestions: [],
        productSuggestions: [],
        brandSuggestions: [],
        categorySuggestions: [],
      };
    }

    const res: any = await this.productsIndex().search(keyword, {
      limit: 6,
      attributesToRetrieve: [
        'id',
        'name',
        'image',
        'minPrice',
        'brandId',
        'categoryId',
      ],
    });

    const products = (res.hits ?? []).map((h: any) => ({
      id: h.id,
      name: h.name,
      image: h.image ?? null,
      minPrice: h.minPrice ?? 0,
      brandId: h.brandId,
      categoryId: h.categoryId,
    }));

    // ✅ bonus: suggest brand/category (để demo autocomplete giống ecommerce)
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`^${escaped}`, 'i');

    const [brands, categories] = await Promise.all([
      this.brandModel
        .find({ isActive: true, name: rx })
        .select({ name: 1, slug: 1, logo: 1 })
        .limit(5)
        .lean(),
      this.categoryModel
        .find({ isActive: true, name: rx })
        .select({ name: 1, slug: 1, parentId: 1 })
        .limit(5)
        .lean(),
    ]);

    return {
      querySuggestions: products.map((p: any) => p.name).slice(0, 5),
      productSuggestions: products,
      brandSuggestions: (brands as any[]).map((b: any) => ({
        id: String(b._id),
        name: String(b.name),
        slug: String(b.slug),
        logo: (b as any).logo ?? null,
      })),
      categorySuggestions: (categories as any[]).map((c: any) => ({
        id: String(c._id),
        name: String(c.name),
        slug: String(c.slug),
        parentId: (c as any).parentId ? String((c as any).parentId) : null,
      })),
    };
  }

  // -----------------------------
  // ✅ Click log (analytics)
  // -----------------------------
  async logClick(input: {
    productId: string;
    queryId?: string;
    q?: string;
    position?: number;
    userId?: string;
    sessionId?: string;
  }) {
    return this.clickLogModel.create({
      productId: input.productId,
      ...(input.queryId ? { queryId: input.queryId } : {}),
      ...(input.q ? { q: input.q } : {}),
      ...(typeof input.position === 'number'
        ? { position: input.position }
        : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      timestamp: new Date(),
    });
  }

  // -----------------------------
  // ✅ Dashboard APIs (analytics)
  // -----------------------------
  async topQueries(days = 7, limit = 20) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.searchLogModel.aggregate([
      { $match: { timestamp: { $gte: since }, q: { $ne: '' } } },
      {
        $group: {
          _id: '$q',
          count: { $sum: 1 },
          avgLatency: { $avg: '$latencyMs' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          q: '$_id',
          count: 1,
          avgLatencyMs: { $round: ['$avgLatency', 0] },
        },
      },
    ]);
  }

  async noResultQueries(days = 7, limit = 20) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.searchLogModel.aggregate([
      { $match: { timestamp: { $gte: since }, totalHits: 0, q: { $ne: '' } } },
      { $group: { _id: '$q', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, q: '$_id', count: 1 } },
    ]);
  }

  async avgLatency(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1) Avg + count (nhẹ, chạy nhanh)
    const [row] = await this.searchLogModel.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgLatency: { $avg: '$latencyMs' },
          count: { $sum: 1 },
        },
      },
    ]);

    const count = Number(row?.count ?? 0);
    const avgLatencyMs = Math.round(Number(row?.avgLatency ?? 0));

    // 2) P95: lấy phần tử ở vị trí ceil(0.95*n)-1 sau khi sort latency tăng dần
    let p95LatencyMs = 0;
    if (count > 0) {
      const idx = Math.max(0, Math.ceil(count * 0.95) - 1);

      const doc = await this.searchLogModel
        .findOne({ timestamp: { $gte: since } })
        .sort({ latencyMs: 1 })
        .skip(idx)
        .select({ latencyMs: 1, _id: 0 })
        .lean();

      p95LatencyMs = Math.round(Number((doc as any)?.latencyMs ?? 0));
    }

    return { avgLatencyMs, p95LatencyMs };
  }

  async ctr(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [searchCount, clickCount] = await Promise.all([
      this.searchLogModel.countDocuments({ timestamp: { $gte: since } }),
      this.clickLogModel.countDocuments({ timestamp: { $gte: since } }),
    ]);

    return {
      searches: searchCount,
      clicks: clickCount,
      ctr: searchCount > 0 ? Number((clickCount / searchCount).toFixed(4)) : 0,
    };
  }

  // -----------------------------
  // ✅ P0: Analytics nâng cấp để “đúng nghĩa search engine”
  // -----------------------------

  /** Top queries theo ngày (trend) */
  async topQueriesDaily(days = 7, limitPerDay = 10) {
    const d = this.clampInt(days, 1, 90);
    const limit = this.clampInt(limitPerDay, 1, 50);
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    return this.searchLogModel.aggregate([
      { $match: { timestamp: { $gte: since }, q: { $ne: '' } } },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp',
                timezone: 'Asia/Ho_Chi_Minh',
              },
            },
            q: '$q',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1, count: -1 } },
      {
        $group: {
          _id: '$_id.day',
          items: { $push: { q: '$_id.q', count: '$count' } },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id',
          top: { $slice: ['$items', limit] },
        },
      },
      { $sort: { day: 1 } },
    ]);
  }

  /** No-result rate (0-hit / total searches) */
  async noResultRate(days = 7) {
    const d = this.clampInt(days, 1, 90);
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    const [searches, noResult] = await Promise.all([
      this.searchLogModel.countDocuments({ timestamp: { $gte: since } }),
      this.searchLogModel.countDocuments({
        timestamp: { $gte: since },
        totalHits: 0,
      }),
    ]);

    return {
      searches,
      noResult,
      noResultRate: searches > 0 ? Number((noResult / searches).toFixed(4)) : 0,
    };
  }

  /** CTR theo query (dựa trên q trong click log) */
  async ctrByQuery(days = 7, limit = 20) {
    const d = this.clampInt(days, 1, 90);
    const lim = this.clampInt(limit, 1, 100);
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    const [searchAgg, clickAgg] = await Promise.all([
      this.searchLogModel.aggregate([
        { $match: { timestamp: { $gte: since }, q: { $ne: '' } } },
        { $group: { _id: '$q', searches: { $sum: 1 } } },
      ]),
      this.clickLogModel.aggregate([
        {
          $match: {
            timestamp: { $gte: since },
            q: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$q', clicks: { $sum: 1 } } },
      ]),
    ]);

    const clickMap = new Map<string, number>();
    for (const r of clickAgg as any[])
      clickMap.set(String(r._id), Number(r.clicks ?? 0));

    const rows = (searchAgg as any[]).map((s) => {
      const q = String(s._id);
      const searches = Number(s.searches ?? 0);
      const clicks = Number(clickMap.get(q) ?? 0);
      return {
        q,
        searches,
        clicks,
        ctr: searches > 0 ? Number((clicks / searches).toFixed(4)) : 0,
      };
    });

    rows.sort((a, b) => b.searches - a.searches);
    return rows.slice(0, lim);
  }
}
