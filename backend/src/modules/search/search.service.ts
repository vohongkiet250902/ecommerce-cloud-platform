import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { SearchLog, SearchLogDocument } from './schemas/search-log.schema';
import { ClickLog, ClickLogDocument } from './schemas/click-log.schema';

import { Product } from '../products/schemas/product.schema';
import { Brand } from '../brands/schemas/brand.schema';
import { Category } from '../categories/schemas/category.schema';

import { TaxonomyResolver } from './utils/taxonomy-resolver.util';
import { QueryIntentAnalyzer } from './utils/query-intent.util';

type SearchSort =
  | 'minPrice:asc'
  | 'minPrice:desc'
  | 'createdAt:desc'
  | 'rating:desc';

type AttributeFilters = Record<string, string[]>;

type CanonicalAttributeKey = 'color' | 'storage' | 'ram';

type MatchedVariantPreview = {
  sku?: string;
  price: number;
  stock: number;
  attributes: Partial<Record<CanonicalAttributeKey, string>>;
};

export type SearchV2Params = {
  q?: string;
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: SearchSort;
  facets?: boolean;
  facetLabels?: boolean;
  userId?: string;
  sessionId?: string;
  attributes?: AttributeFilters;
};

type ProductSearchDoc = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  semanticText?: string;
  categoryName?: string;
  brandName?: string;
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
  attributePairs: string[];
};

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch;
  private indexUid: string;

  private taxonomyResolver: TaxonomyResolver;
  private intentAnalyzer: QueryIntentAnalyzer;

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

    this.taxonomyResolver = new TaxonomyResolver(
      this.categoryModel,
      this.brandModel,
    );
    this.intentAnalyzer = new QueryIntentAnalyzer(this.taxonomyResolver);
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
    try {
      await this.taxonomyResolver.loadTaxonomy();
      await this.ensureProductsIndexAndSettings();
    } catch (e: any) {
      console.error('[Meili] ensure settings failed:', e?.message ?? e);
    }
  }

  private async ensureTaxonomyReady() {
    if (!this.taxonomyResolver.isReady) {
      await this.taxonomyResolver.loadTaxonomy();
    }
  }

  private loadSynonyms(): Record<string, string[]> {
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
        // ignore malformed synonym file
      }
    }

    return {
      'tai nghe': ['headphone', 'earphone'],
      'ốp lưng': ['case', 'phone case'],
      sạc: ['charger', 'adapter'],
      'điện thoại': ['phone', 'smartphone'],
      iphone: ['i phone', 'ip'],
      laptop: ['notebook', 'may tinh xach tay'],
    };
  }

  private async ensureProductsIndexAndSettings() {
    try {
      await this.client.getIndex(this.indexUid);
    } catch {
      await this.client.createIndex(this.indexUid, { primaryKey: 'id' });
    }

    await this.productsIndex().updateSettings({
      searchableAttributes: [
        'name',
        'brandName',
        'categoryName',
        'slug',
        'description',
        'semanticText',
      ],
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
      synonyms: this.loadSynonyms(),
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      },
      stopWords: ['và', 'là', 'của', 'cho', 'với', 'một', 'các', 'những', 'từ'],
    });
  }

  private normalizeText(s: any): string {
    return String(s ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private normalizeLooseVi(s: any): string {
    return String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s.,/-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeAttrToken(value: any): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[_/]+/g, ' ')
      .replace(/[^a-z0-9\s.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private slugAttrToken(value: any): string {
    return this.normalizeAttrToken(value).replace(/\s+/g, '_');
  }

  private toPlainValue(value: any): any {
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as any).toObject === 'function'
    ) {
      return (value as any).toObject();
    }
    return value;
  }

  private isKeyValueEntry(value: any): value is { key: any; value: any } {
    const plain = this.toPlainValue(value);
    return (
      !!plain &&
      typeof plain === 'object' &&
      !Array.isArray(plain) &&
      'key' in plain &&
      'value' in plain
    );
  }

  private extractKeyValueEntries(
    input: any,
  ): Array<{ key: string; value: any }> {
    const plain = this.toPlainValue(input);
    if (!plain) return [];

    if (Array.isArray(plain)) {
      return plain
        .map((item) => this.toPlainValue(item))
        .filter(
          (item: any) =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            'key' in item,
        )
        .map((item: any) => ({
          key: String(item.key ?? '').trim(),
          value: item.value,
        }))
        .filter((item) => item.key);
    }

    if (typeof plain === 'object') {
      return Object.entries(plain)
        .map(([key, value]) => ({
          key: String(key).trim(),
          value: this.toPlainValue(value),
        }))
        .filter((item) => item.key);
    }

    return [];
  }

  private canonicalAttributeKey(
    rawKey: any,
  ): CanonicalAttributeKey | undefined {
    const key = this.normalizeAttrToken(rawKey);
    if (!key) return undefined;

    if (
      /^(mau|mau sac|color|colour|finish)$/.test(key) ||
      key.includes('mau')
    ) {
      return 'color';
    }

    if (/^(ram|bo nho ram|memory ram)$/.test(key) || key.includes('ram')) {
      return 'ram';
    }

    if (
      /^(storage|rom|ssd|hdd|capacity|dung luong|bo nho|bo nho trong|phien ban|version)$/.test(
        key,
      ) ||
      key.includes('dung luong') ||
      key.includes('storage') ||
      key.includes('rom') ||
      key.includes('phien ban')
    ) {
      return 'storage';
    }

    return undefined;
  }

  private colorAliasEntries(): Array<[string, string[]]> {
    return [
      ['den', ['den', 'black', 'jet black', 'midnight', 'black titanium']],
      ['trang', ['trang', 'white', 'starlight', 'silver white']],
      ['xam', ['xam', 'gray', 'grey', 'space gray', 'graphite']],
      ['bac', ['bac', 'silver']],
      ['vang', ['vang', 'gold']],
      ['hong', ['hong', 'pink', 'rose gold']],
      ['do', ['do', 'red']],
      ['xanh', ['xanh', 'blue', 'xanh da troi', 'sky blue', 'light blue']],
      ['xanh_la', ['xanh la', 'green']],
      ['tim', ['tim', 'purple', 'violet']],
      ['titan', ['titan', 'titanium', 'natural titanium']],
    ];
  }

  private canonicalizeCapacityValue(rawValue: any): string | undefined {
    const text = this.normalizeAttrToken(rawValue).replace(/\s+/g, '');
    const match = text.match(/(\d{1,4})(gb|tb)/i);
    if (!match) return undefined;

    const num = Number(match[1]);
    const unit = String(match[2]).toLowerCase();

    if (!Number.isFinite(num) || num <= 0) return undefined;
    return `${num}${unit}`;
  }

  private canonicalizeColorValue(rawValue: any): string | undefined {
    const text = ` ${this.normalizeAttrToken(rawValue)} `;
    if (!text.trim()) return undefined;

    for (const [canonical, aliases] of this.colorAliasEntries()) {
      for (const alias of aliases) {
        const rx = new RegExp(`\\b${this.escapeRegex(alias)}\\b`, 'i');
        if (rx.test(text)) return canonical;
      }
    }

    return undefined;
  }

  private canonicalizeAttributeValue(
    canonicalKey: CanonicalAttributeKey,
    rawValue: any,
  ): string | undefined {
    if (rawValue == null || typeof rawValue === 'object') return undefined;

    if (canonicalKey === 'color') {
      return this.canonicalizeColorValue(rawValue);
    }

    if (canonicalKey === 'storage' || canonicalKey === 'ram') {
      return this.canonicalizeCapacityValue(rawValue);
    }

    return undefined;
  }

  private resolveCanonicalAttribute(
    rawKey: any,
    rawValue: any,
  ): { key: CanonicalAttributeKey; value: string } | undefined {
    const key = this.normalizeAttrToken(rawKey);
    if (!key) return undefined;

    const colorValue = this.canonicalizeColorValue(rawValue);
    const capacityValue = this.canonicalizeCapacityValue(rawValue);

    if (
      (/^(mau|mau sac|color|colour|finish)$/.test(key) ||
        key.includes('mau')) &&
      colorValue
    ) {
      return { key: 'color', value: colorValue };
    }

    if (
      (/^(ram|bo nho ram|memory ram|unified memory)$/.test(key) ||
        key.includes('ram') ||
        key.includes('unified memory')) &&
      capacityValue
    ) {
      return { key: 'ram', value: capacityValue };
    }

    // key mơ hồ như "bo nho" / "memory": dùng value để quyết định
    if (
      (key === 'bo nho' || key === 'memory' || key.includes('bo nho')) &&
      capacityValue
    ) {
      const numeric = Number.parseInt(capacityValue, 10);

      // 8/16/32/64GB thường là RAM
      if (capacityValue.endsWith('gb') && numeric > 0 && numeric <= 64) {
        return { key: 'ram', value: capacityValue };
      }

      // 128GB+ hoặc TB thường là storage
      return { key: 'storage', value: capacityValue };
    }

    if (
      (/^(storage|rom|ssd|hdd|capacity|dung luong|bo nho trong|phien ban|version)$/.test(
        key,
      ) ||
        key.includes('dung luong') ||
        key.includes('storage') ||
        key.includes('rom') ||
        key.includes('ssd') ||
        key.includes('hdd') ||
        key.includes('phien ban')) &&
      capacityValue
    ) {
      return { key: 'storage', value: capacityValue };
    }

    return undefined;
  }

  private mergeAttributeFilters(
    ...sources: Array<AttributeFilters | undefined>
  ): AttributeFilters | undefined {
    const merged: AttributeFilters = {};

    for (const source of sources) {
      if (!source) continue;

      for (const [key, values] of Object.entries(source)) {
        const arr = Array.isArray(values) ? values : [values as any];
        merged[key] = Array.from(
          new Set([...(merged[key] ?? []), ...arr.map((x) => String(x))]),
        );
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private extractNaturalAttributeFilters(query: string): {
    cleanedQuery: string;
    attributes?: AttributeFilters;
  } {
    let working = ` ${this.normalizeLooseVi(query)} `;
    const extracted: AttributeFilters = {};

    const add = (key: string, value: string | undefined) => {
      if (!value) return;
      extracted[key] = Array.from(new Set([...(extracted[key] ?? []), value]));
    };

    const replacePattern = (
      regex: RegExp,
      onMatch: (...groups: string[]) => { key: string; value?: string },
    ) => {
      working = working.replace(regex, (...args: any[]) => {
        const groups = args.slice(1, -2) as string[];
        const result = onMatch(...groups);
        add(result.key, result.value);
        return ' ';
      });
    };

    replacePattern(
      /\b(?:ram\s*)?(\d{1,2}|24|32|48|64)\s*gb\s*ram\b/gi,
      (num) => ({
        key: 'ram',
        value: `${Number(num)}gb`,
      }),
    );

    replacePattern(/\bram\s*(\d{1,2}|24|32|48|64)\s*gb\b/gi, (num) => ({
      key: 'ram',
      value: `${Number(num)}gb`,
    }));

    replacePattern(/\b(\d{1,2}|24|32|48|64)\s*gb\s*ram\b/gi, (num) => ({
      key: 'ram',
      value: `${Number(num)}gb`,
    }));

    replacePattern(
      /\b(?:ssd|rom|storage|bo nho|dung luong)\s*(\d{2,4})\s*(gb|tb)\b/gi,
      (num, unit) => ({
        key: 'storage',
        value:
          Number(num) >= 64
            ? `${Number(num)}${String(unit).toLowerCase()}`
            : undefined,
      }),
    );

    replacePattern(
      /\b(\d{2,4})\s*(gb|tb)\b(?:\s*(?:ssd|rom|storage|bo nho|dung luong))?\b/gi,
      (num, unit) => ({
        key: 'storage',
        value:
          Number(num) >= 64
            ? `${Number(num)}${String(unit).toLowerCase()}`
            : undefined,
      }),
    );

    const colorAliases = this.colorAliasEntries()
      .flatMap(([canonical, aliases]) =>
        aliases.map((alias) => ({ canonical, alias })),
      )
      .sort((a, b) => b.alias.length - a.alias.length);

    for (const item of colorAliases) {
      const rx = new RegExp(`\\b${this.escapeRegex(item.alias)}\\b`, 'gi');
      working = working.replace(rx, () => {
        add('color', item.canonical);
        return ' ';
      });
    }

    if (extracted.color) {
      working = working.replace(/\b(?:mau|mau sac|color|colour)\b/gi, ' ');
    }
    if (extracted.storage) {
      working = working.replace(
        /\b(?:ssd|rom|storage|bo nho|dung luong)\b/gi,
        ' ',
      );
    }
    if (extracted.ram) {
      working = working.replace(/\bram\b/gi, ' ');
    }

    const cleanedQuery = working.replace(/\s+/g, ' ').trim();

    return {
      cleanedQuery,
      attributes: Object.keys(extracted).length > 0 ? extracted : undefined,
    };
  }

  private collectAttributePairs(productData: any): string[] {
    const out = new Set<string>();

    const pushPair = (rawKey: any, rawValue: any) => {
      const resolved = this.resolveCanonicalAttribute(rawKey, rawValue);
      if (!resolved) return;

      out.add(`${resolved.key}:${resolved.value}`);
    };

    for (const item of this.extractKeyValueEntries(productData?.specs)) {
      pushPair(item.key, item.value);
    }

    const activeVariants: any[] = Array.isArray(productData?.variants)
      ? productData.variants.filter(
          (v: any) => (v?.status || 'active') === 'active',
        )
      : [];

    for (const variant of activeVariants) {
      for (const item of this.extractKeyValueEntries(variant?.attributes)) {
        pushPair(item.key, item.value);
      }
    }

    return Array.from(out);
  }

  private buildAttributeFilter(attributes?: AttributeFilters): string[] {
    if (!attributes) return [];

    const clauses: string[] = [];

    for (const [rawKey, rawValues] of Object.entries(attributes)) {
      const key = this.canonicalAttributeKey(rawKey);
      if (!key) continue;

      const values = Array.from(
        new Set(
          (Array.isArray(rawValues) ? rawValues : [rawValues])
            .map((x) => this.canonicalizeAttributeValue(key, x))
            .filter((x): x is string => Boolean(x)),
        ),
      );

      if (values.length === 0) continue;

      const orClause = values
        .map((value) => `attributePairs = "${this.esc(`${key}:${value}`)}"`)
        .join(' OR ');

      clauses.push(values.length > 1 ? `(${orClause})` : orClause);
    }

    return clauses;
  }

  private prettifyAttributeToken(token: string): string {
    switch (token) {
      case 'color':
        return 'Màu sắc';
      case 'storage':
        return 'Dung lượng';
      case 'ram':
        return 'RAM';
      case 'den':
        return 'Đen';
      case 'trang':
        return 'Trắng';
      case 'xam':
        return 'Xám';
      case 'bac':
        return 'Bạc';
      case 'vang':
        return 'Vàng';
      case 'hong':
        return 'Hồng';
      case 'do':
        return 'Đỏ';
      case 'xanh':
        return 'Xanh';
      case 'xanh_la':
        return 'Xanh lá';
      case 'tim':
        return 'Tím';
      case 'titan':
        return 'Titan';
      default:
        return String(token ?? '')
          .replace(/_/g, ' ')
          .trim();
    }
  }

  private mapAttributeFacetLabels(facetDistribution: any) {
    const raw = facetDistribution?.attributePairs ?? {};
    const grouped: Record<
      string,
      Array<{
        value: string;
        label: string;
        count: number;
        pair: string;
      }>
    > = {};

    for (const [pair, count] of Object.entries(raw)) {
      const text = String(pair);
      const idx = text.indexOf(':');
      if (idx <= 0) continue;

      const key = text.slice(0, idx);
      const value = text.slice(idx + 1);
      if (!key || !value) continue;

      if (!grouped[key]) grouped[key] = [];

      grouped[key].push({
        value,
        label: this.prettifyAttributeToken(value),
        count: Number(count ?? 0),
        pair: text,
      });
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) => b.count - a.count || a.value.localeCompare(b.value),
      );
    }

    return grouped;
  }

  private extractVariantCanonicalAttributes(
    variant: any,
  ): Partial<Record<CanonicalAttributeKey, string>> {
    const result: Partial<Record<CanonicalAttributeKey, string>> = {};

    for (const item of this.extractKeyValueEntries(variant?.attributes)) {
      const resolved = this.resolveCanonicalAttribute(item.key, item.value);
      if (!resolved) continue;

      result[resolved.key] = resolved.value;
    }

    return result;
  }

  private computeVariantEffectivePrice(variant: any): number {
    const rawPrice = Number(variant?.finalPrice ?? variant?.price ?? 0);
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return 0;

    if (variant?.finalPrice != null) return rawPrice;

    const discount = Number(variant?.discountPercentage ?? 0);
    if (Number.isFinite(discount) && discount > 0) {
      return Math.round(rawPrice * (1 - discount / 100));
    }

    return rawPrice;
  }

  private getMatchedVariants(
    productData: any,
    attributes?: AttributeFilters,
    options?: { requireInStock?: boolean; previewLimit?: number },
  ): MatchedVariantPreview[] {
    const previewLimit = Math.max(1, Number(options?.previewLimit ?? 3));
    const requireInStock = options?.requireInStock === true;
    const sourceVariants: any[] = Array.isArray(productData?.variants)
      ? productData.variants
      : [];

    const requestedPairs: Array<[CanonicalAttributeKey, string[]]> = [];

    for (const [rawKey, rawValues] of Object.entries(attributes ?? {})) {
      const key = this.canonicalAttributeKey(rawKey);
      if (!key) continue;

      const values = Array.from(
        new Set(
          (Array.isArray(rawValues) ? rawValues : [rawValues])
            .map((x) => this.canonicalizeAttributeValue(key, x))
            .filter((x): x is string => Boolean(x)),
        ),
      );

      if (values.length > 0) {
        requestedPairs.push([key, values]);
      }
    }

    if (requestedPairs.length === 0) return [];

    const matched: MatchedVariantPreview[] = [];

    for (const variant of sourceVariants) {
      if (!variant) continue;
      if ((variant.status || 'active') !== 'active') continue;

      const stock = Number(variant.stock ?? 0);
      if (requireInStock && (!Number.isFinite(stock) || stock <= 0)) continue;

      const variantAttrs = this.extractVariantCanonicalAttributes(variant);

      let ok = true;
      for (const [key, wantedValues] of requestedPairs) {
        const actual = variantAttrs[key];
        if (!actual || !wantedValues.includes(actual)) {
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      matched.push({
        sku: variant?.sku ? String(variant.sku) : undefined,
        price: this.computeVariantEffectivePrice(variant),
        stock: Number.isFinite(stock) ? stock : 0,
        attributes: variantAttrs,
      });
    }

    matched.sort((a, b) => {
      if (b.stock !== a.stock) return b.stock - a.stock;
      return a.price - b.price;
    });

    return matched.slice(0, previewLimit);
  }

  private async applyVariantPostFilter(
    coarseHits: any[],
    attributes?: AttributeFilters,
    options?: { requireInStock?: boolean; previewLimit?: number },
  ) {
    const hasVariantFilters =
      !!attributes &&
      Object.keys(attributes).some((k) => {
        const key = this.canonicalAttributeKey(k);
        if (!key) return false;
        const values = Array.isArray(attributes[k]) ? attributes[k] : [];
        return values.length > 0;
      });

    if (!hasVariantFilters) {
      return {
        hits: coarseHits,
        strictVariantFiltering: false,
      };
    }

    const ids = coarseHits
      .map((hit) => {
        try {
          return new Types.ObjectId(String(hit.id));
        } catch {
          return null;
        }
      })
      .filter((x): x is Types.ObjectId => Boolean(x));

    if (ids.length === 0) {
      return {
        hits: [],
        strictVariantFiltering: true,
      };
    }

    const docs = await this.productModel
      .find({ _id: { $in: ids }, status: 'active' })
      .select({ variants: 1, status: 1 })
      .lean();

    const productMap = new Map<string, any>();
    for (const doc of docs as any[]) {
      productMap.set(String(doc._id), doc);
    }

    const filteredHits: any[] = [];

    for (const hit of coarseHits) {
      const doc = productMap.get(String(hit.id));
      if (!doc) continue;

      const matchedVariants = this.getMatchedVariants(doc, attributes, options);
      if (matchedVariants.length === 0) continue;

      filteredHits.push({
        ...hit,
        matchedVariantCount: matchedVariants.length,
        matchedVariants,
      });
    }

    return {
      hits: filteredHits,
      strictVariantFiltering: true,
    };
  }

  private mergeFilterClauses(
    ...groups: Array<Array<string | undefined | null> | undefined>
  ): string | undefined {
    const parts = groups
      .flatMap((group) => group ?? [])
      .filter((x): x is string => Boolean(x && x.trim()));
    return parts.length ? parts.join(' AND ') : undefined;
  }

  private looksConversationalQuery(q: string): boolean {
    const normalized = this.normalizeLooseVi(q);
    if (!normalized) return false;

    const conversationalSignals = [
      'nao',
      'phu hop',
      'hop cho',
      'nen mua',
      'goi y',
      'tu van',
      'giup',
      'duoi',
      'tren',
      'tu',
      'nguoi lon tuoi',
      'hoc sinh',
      'sinh vien',
      'choi game',
      'van phong',
    ];

    return (
      normalized.split(/\s+/).length >= 4 ||
      conversationalSignals.some((signal) => normalized.includes(signal))
    );
  }

  private buildSearchOptions(input: {
    q: string;
    params: SearchV2Params;
    filter?: string;
    limit: number;
    offset: number;
  }): any {
    const opts: any = {
      limit: input.limit,
      offset: input.offset,
      filter: input.filter,
      sort: this.buildSort(input.params),
      facets:
        input.params.facets === false
          ? undefined
          : ['brandId', 'categoryId', 'attributePairs'],
      attributesToRetrieve: [
        'id',
        'name',
        'slug',
        'description',
        'semanticText',
        'image',
        'images',
        'minPrice',
        'maxPrice',
        'inStock',
        'totalStock',
        'rating',
        'reviewCount',
        'brandId',
        'brandName',
        'categoryId',
        'categoryName',
        'isFeatured',
        'createdAt',
        'attributePairs',
      ],
    };

    const tokenCount = input.q.trim().split(/\s+/).filter(Boolean).length;
    if (
      input.q.trim() &&
      tokenCount > 0 &&
      tokenCount <= 2 &&
      !this.looksConversationalQuery(input.q)
    ) {
      opts.matchingStrategy = 'all';
    }

    return opts;
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

      if (Number.isFinite(effectivePrice) && effectivePrice > 0) {
        prices.push(effectivePrice);
      }
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

  private collectSemanticFragments(
    value: any,
    output: string[],
    depth = 0,
  ): void {
    if (value == null || depth > 3) return;

    const plain = this.toPlainValue(value);
    if (plain == null) return;

    if (
      typeof plain === 'string' ||
      typeof plain === 'number' ||
      typeof plain === 'boolean'
    ) {
      const text = String(plain).trim();
      if (text) output.push(text);
      return;
    }

    if (Array.isArray(plain)) {
      for (const item of plain) {
        const normalizedItem = this.toPlainValue(item);

        if (this.isKeyValueEntry(normalizedItem)) {
          const key = String(normalizedItem.key ?? '').trim();
          const val = normalizedItem.value;

          if (val == null) continue;

          if (
            typeof val === 'string' ||
            typeof val === 'number' ||
            typeof val === 'boolean'
          ) {
            const text = `${key} ${String(val).trim()}`.trim();
            if (text) output.push(text);
          } else {
            this.collectSemanticFragments(val, output, depth + 1);
          }
        } else {
          this.collectSemanticFragments(normalizedItem, output, depth + 1);
        }
      }
      return;
    }

    if (typeof plain === 'object') {
      for (const [key, val] of Object.entries(plain)) {
        if (val == null) continue;

        if (
          typeof val === 'string' ||
          typeof val === 'number' ||
          typeof val === 'boolean'
        ) {
          const text = `${key} ${String(val).trim()}`.trim();
          if (text) output.push(text);
        } else {
          this.collectSemanticFragments(val, output, depth + 1);
        }
      }
    }
  }

  private buildSemanticText(
    productData: any,
    brandName?: string,
    categoryName?: string,
  ): string {
    const parts: string[] = [];

    const push = (value: any) => {
      const text = String(value ?? '').trim();
      if (text) parts.push(text);
    };

    push(productData?.name);
    push(brandName);
    push(categoryName);
    push(productData?.description);

    const semanticFragments: string[] = [];
    this.collectSemanticFragments(productData?.specs, semanticFragments);

    const activeVariants: any[] = Array.isArray(productData?.variants)
      ? productData.variants.filter(
          (v: any) => (v?.status || 'active') === 'active',
        )
      : [];

    for (const variant of activeVariants.slice(0, 3)) {
      this.collectSemanticFragments(variant?.attributes, semanticFragments);
    }

    for (const fragment of semanticFragments.slice(0, 25)) {
      push(fragment);
    }

    const unique: string[] = [];
    const seen = new Set<string>();

    for (const part of parts) {
      const normalized = this.normalizeText(part);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      unique.push(part);
    }

    return unique.join('. ').slice(0, 1500);
  }

  private parsePriceToken(raw: string): number | undefined {
    const input = this.normalizeLooseVi(raw);
    if (!input) return undefined;

    const numberMatch = input.match(/[\d]+(?:[.,][\d]+)?/);
    if (!numberMatch) return undefined;

    const numeric = Number(numberMatch[0].replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

    const normalized = input.replace(/\s+/g, '');

    let multiplier = 1;
    if (/(ty|ti)/.test(normalized)) multiplier = 1_000_000_000;
    else if (/(trieu|tr|cu)/.test(normalized)) multiplier = 1_000_000;
    else if (/(nghin|ngan|k)/.test(normalized)) multiplier = 1_000;
    else if (numeric < 1000) return undefined;

    return Math.round(numeric * multiplier);
  }

  private extractNaturalPriceRange(query: string): {
    minPrice?: number;
    maxPrice?: number;
  } {
    const q = this.normalizeLooseVi(query);
    if (!q) return {};

    const makeTokenPattern =
      '([0-9]+(?:[.,][0-9]+)?(?:\\s*(?:ty|ti|trieu|tr|cu|nghin|ngan|k))?)';

    const rangePatterns = [
      new RegExp(
        `\\btu\\s+${makeTokenPattern}\\s+(?:den|toi)\\s+${makeTokenPattern}\\b`,
        'i',
      ),
      new RegExp(`\\b${makeTokenPattern}\\s*-\\s*${makeTokenPattern}\\b`, 'i'),
    ];

    for (const pattern of rangePatterns) {
      const match = q.match(pattern);
      if (!match) continue;

      const min = this.parsePriceToken(match[1]);
      const max = this.parsePriceToken(match[2]);
      if (min != null && max != null) {
        return min <= max
          ? { minPrice: min, maxPrice: max }
          : { minPrice: max, maxPrice: min };
      }
    }

    const maxPatterns = [
      new RegExp(
        `\\b(?:duoi|toi da|khong qua|nho hon|re hon)\\s+${makeTokenPattern}\\b`,
        'i',
      ),
    ];

    for (const pattern of maxPatterns) {
      const match = q.match(pattern);
      if (!match) continue;
      const max = this.parsePriceToken(match[1]);
      if (max != null) return { maxPrice: max };
    }

    const minPatterns = [
      new RegExp(`\\b(?:tren|tu)\\s+${makeTokenPattern}\\b`, 'i'),
    ];

    for (const pattern of minPatterns) {
      const match = q.match(pattern);
      if (!match) continue;
      const min = this.parsePriceToken(match[1]);
      if (min != null) return { minPrice: min };
    }

    return {};
  }

  private toSearchDoc(productData: any): ProductSearchDoc | null {
    if (!productData?._id) return null;
    if ((productData.status || 'active') !== 'active') return null;

    const { minPrice, maxPrice } = this.computeMinMaxPrice(productData);
    const totalStock = this.computeTotalStock(productData);
    const inStock = totalStock > 0;

    const categoryIdRaw = productData.categoryId;
    const brandIdRaw = productData.brandId;

    const categoryId =
      categoryIdRaw && typeof categoryIdRaw === 'object' && categoryIdRaw._id
        ? String(categoryIdRaw._id)
        : categoryIdRaw
          ? String(categoryIdRaw)
          : undefined;

    const brandId =
      brandIdRaw && typeof brandIdRaw === 'object' && brandIdRaw._id
        ? String(brandIdRaw._id)
        : brandIdRaw
          ? String(brandIdRaw)
          : undefined;

    const categoryName =
      categoryIdRaw && typeof categoryIdRaw === 'object' && categoryIdRaw.name
        ? String(categoryIdRaw.name)
        : undefined;

    const brandName =
      brandIdRaw && typeof brandIdRaw === 'object' && brandIdRaw.name
        ? String(brandIdRaw.name)
        : undefined;

    const images = Array.isArray(productData?.images)
      ? productData.images.map((x: any) => x?.url).filter(Boolean)
      : [];

    const createdAt =
      productData?.createdAt instanceof Date
        ? productData.createdAt.getTime()
        : Number.isFinite(Number(productData?.createdAt))
          ? Number(productData.createdAt)
          : Date.now();

    const attributePairs = this.collectAttributePairs(productData);

    return {
      id: String(productData._id),
      name: String(productData.name ?? ''),
      slug: String(productData.slug ?? ''),
      description: String(productData.description ?? ''),
      semanticText: this.buildSemanticText(
        productData,
        brandName,
        categoryName,
      ),
      categoryId,
      brandId,
      categoryName,
      brandName,
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
      attributePairs,
    };
  }

  async addOrUpdateProduct(productData: any) {
    const doc = this.toSearchDoc(productData);
    if (!doc) return { ok: true, skipped: true };
    return this.productsIndex().addDocuments([doc], { primaryKey: 'id' });
  }

  async removeProduct(productId: string) {
    return this.productsIndex().deleteDocument(productId);
  }

  async reindexProducts(input?: {
    batchSize?: number;
    purge?: boolean;
    onlyActive?: boolean;
  }) {
    if (input?.batchSize != null && !Number.isFinite(Number(input.batchSize))) {
      throw new BadRequestException('batchSize must be a number');
    }

    const batchSize = this.clampInt(input?.batchSize ?? 500, 50, 2000);
    const purge = input?.purge !== false;
    const onlyActive = input?.onlyActive === true;

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
      .populate({ path: 'categoryId', select: 'name' })
      .populate({ path: 'brandId', select: 'name' })
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
        if (buffer.length >= batchSize) {
          await flush();
        }
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
      errors: errors.slice(0, 20),
    };
  }

  private esc(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private buildMeiliFilter(p: SearchV2Params): string | undefined {
    const parts: string[] = [];

    if (p.categoryId) parts.push(`categoryId = "${this.esc(p.categoryId)}"`);
    if (p.brandId) parts.push(`brandId = "${this.esc(p.brandId)}"`);
    if (typeof p.inStock === 'boolean') parts.push(`inStock = ${p.inStock}`);

    if (Number.isFinite(p.minPrice as number)) {
      parts.push(`maxPrice >= ${Number(p.minPrice)}`);
    }

    if (Number.isFinite(p.maxPrice as number)) {
      parts.push(`minPrice <= ${Number(p.maxPrice)}`);
    }

    parts.push(...this.buildAttributeFilter(p.attributes));

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
    for (const c of categories as any[]) {
      categoryId[String(c._id)] = String(c.name);
    }

    return {
      brandId,
      categoryId,
      attributes: this.mapAttributeFacetLabels(facetDistribution),
    };
  }

  private async suggestedQueriesByPrefix(prefix: string, limit = 5) {
    const q = this.normalizeText(prefix);
    if (!q) return [];

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  async searchProductsV2(params: SearchV2Params) {
    await this.ensureTaxonomyReady();

    const page = this.clampInt(params.page ?? 1, 1, 10_000);
    const limit = this.clampInt(params.limit ?? 20, 1, 60);
    const offset = (page - 1) * limit;

    const rawQ = (params.q ?? '').trim();
    const intent = this.intentAnalyzer.analyze(rawQ);
    const inferredPrice = this.extractNaturalPriceRange(rawQ);

    const naturalAttributeExtraction =
      this.extractNaturalAttributeFilters(rawQ);

    const effectiveParams: SearchV2Params = {
      ...params,
      minPrice:
        params.minPrice != null ? params.minPrice : inferredPrice.minPrice,
      maxPrice:
        params.maxPrice != null ? params.maxPrice : inferredPrice.maxPrice,
      attributes: this.mergeAttributeFilters(
        params.attributes,
        naturalAttributeExtraction.attributes,
      ),
    };

    const explicitFilter = this.buildMeiliFilter(effectiveParams);

    const inferredFilterParts: string[] = [];

    if (!effectiveParams.categoryId && intent.inferredCategoryIds.length > 0) {
      const catList = intent.inferredCategoryIds
        .map((id) => `"${this.esc(id)}"`)
        .join(', ');
      inferredFilterParts.push(`categoryId IN [${catList}]`);
    }

    if (!effectiveParams.brandId && intent.inferredBrandIds.length > 0) {
      const brandList = intent.inferredBrandIds
        .map((id) => `"${this.esc(id)}"`)
        .join(', ');
      inferredFilterParts.push(`brandId IN [${brandList}]`);
    }

    const inferredFilter = inferredFilterParts.length
      ? inferredFilterParts.join(' AND ')
      : undefined;

    const finalFilter = this.mergeFilterClauses(
      explicitFilter ? [explicitFilter] : undefined,
      inferredFilter ? [inferredFilter] : undefined,
    );

    const cleanedNaturalQ =
      naturalAttributeExtraction.cleanedQuery?.trim() ?? '';
    const fallbackTextQ =
      cleanedNaturalQ ||
      (intent.strategy === 'filter-only'
        ? ''
        : intent.cleanQuery?.trim() || '') ||
      rawQ;

    const safeEffectiveQ = fallbackTextQ;

    if (!safeEffectiveQ && !finalFilter) {
      return {
        hits: [],
        facets: {},
        processingTimeMs: 0,
        totalHits: 0,
        page,
        limit,
      };
    }

    const hasVariantLevelFilters = Boolean(
      effectiveParams.attributes &&
      Object.keys(effectiveParams.attributes).length > 0,
    );

    const candidateLimit = hasVariantLevelFilters
      ? Math.min(Math.max(offset + limit * 4, 80), 240)
      : limit;

    const candidateOffset = hasVariantLevelFilters ? 0 : offset;

    const queryId = this.newQueryId();
    const t0 = Date.now();

    const doSearch = (input: { filter?: string; qToUse?: string }) => {
      const searchQuery =
        input.qToUse !== undefined ? input.qToUse : safeEffectiveQ;

      return this.productsIndex().search(
        searchQuery,
        this.buildSearchOptions({
          q: searchQuery,
          params: effectiveParams,
          filter: input.filter,
          limit: candidateLimit,
          offset: candidateOffset,
        }),
      );
    };

    const attempts: Array<{ qToUse: string; filter?: string }> = [];
    const seenAttempts = new Set<string>();

    const pushAttempt = (qToUse: string, filter?: string) => {
      const key = `${qToUse}__${filter ?? ''}`;
      if (seenAttempts.has(key)) return;
      seenAttempts.add(key);
      attempts.push({ qToUse, filter });
    };

    pushAttempt(safeEffectiveQ, finalFilter);

    if (rawQ && rawQ !== safeEffectiveQ) {
      pushAttempt(rawQ, finalFilter);
    }

    if (explicitFilter && explicitFilter !== finalFilter) {
      pushAttempt(safeEffectiveQ || rawQ, explicitFilter);
      if (rawQ && rawQ !== safeEffectiveQ) {
        pushAttempt(rawQ, explicitFilter);
      }
    }

    if (finalFilter && safeEffectiveQ) {
      pushAttempt('', finalFilter);
    }

    if (
      explicitFilter &&
      explicitFilter !== finalFilter &&
      (safeEffectiveQ || rawQ)
    ) {
      pushAttempt('', explicitFilter);
    }
    let res: any = null;
    let coarseTotalHits = 0;

    for (const attempt of attempts) {
      const currentRes: any = await doSearch(attempt);
      const currentTotalHits =
        currentRes.estimatedTotalHits ?? currentRes.nbHits ?? 0;

      if (!res) {
        res = currentRes;
        coarseTotalHits = currentTotalHits;
      }

      if (currentTotalHits > 0) {
        res = currentRes;
        coarseTotalHits = currentTotalHits;
        break;
      }
    }

    const postFiltered = await this.applyVariantPostFilter(
      res?.hits ?? [],
      effectiveParams.attributes,
      {
        requireInStock: effectiveParams.inStock === true,
        previewLimit: 3,
      },
    );

    const finalHits = hasVariantLevelFilters
      ? postFiltered.hits.slice(offset, offset + limit)
      : postFiltered.hits;

    const totalHits = hasVariantLevelFilters
      ? postFiltered.hits.length
      : coarseTotalHits;

    const latencyMs = Date.now() - t0;

    void this.searchLogModel.create({
      queryId,
      q: rawQ,
      filters: {
        categoryId: effectiveParams.categoryId,
        brandId: effectiveParams.brandId,
        inStock: effectiveParams.inStock,
        minPrice: effectiveParams.minPrice,
        maxPrice: effectiveParams.maxPrice,
        attributes: effectiveParams.attributes,
        inferredCategoryIds:
          intent.inferredCategoryIds.length > 0
            ? intent.inferredCategoryIds
            : undefined,
        inferredBrandIds:
          intent.inferredBrandIds.length > 0
            ? intent.inferredBrandIds
            : undefined,
        inferredIntent: intent.intentGroup,
        inferredSearchMode: intent.strategy,
      },
      ...(effectiveParams.sort ? { sort: effectiveParams.sort } : {}),
      totalHits,
      latencyMs,
      ...(res?.processingTimeMs != null
        ? { processingTimeMs: res.processingTimeMs }
        : {}),
      ...(effectiveParams.userId ? { userId: effectiveParams.userId } : {}),
      ...(effectiveParams.sessionId
        ? { sessionId: effectiveParams.sessionId }
        : {}),
      timestamp: new Date(),
    });

    const facets = res?.facetDistribution ?? {};
    const includeFacetLabels =
      effectiveParams.facets !== false && (effectiveParams.facetLabels ?? true);
    const facetLabels = includeFacetLabels
      ? await this.mapFacetLabels(facets)
      : undefined;

    let noResult: any = undefined;
    if (totalHits === 0 && rawQ) {
      const suggestedQueries = await this.suggestedQueriesByPrefix(rawQ, 5);
      noResult = { suggestedQueries };
    }

    return {
      queryId,
      hits: finalHits,
      facets,
      ...(facetLabels ? { facetLabels } : {}),
      ...(noResult ? { noResult } : {}),
      processingTimeMs: res?.processingTimeMs ?? 0,
      totalHits,
      page,
      limit,
      strictVariantFiltering: postFiltered.strictVariantFiltering,
      coarseTotalHits,
    };
  }

  async retrieveForAi(input: {
    message: string;
    limit?: number;
    userId?: string;
    sessionId?: string;
  }) {
    await this.ensureTaxonomyReady();

    const limit = this.clampInt(input.limit ?? 5, 1, 12);
    const message = String(input.message ?? '').trim();
    const intent = this.intentAnalyzer.analyze(message);

    const result = await this.searchProductsV2({
      q: message,
      page: 1,
      limit,
      facets: false,
      facetLabels: false,
      userId: input.userId,
      sessionId: input.sessionId,
    });

    return {
      originalMessage: message,
      normalizedQuery: intent.normalizedQuery,
      cleanQuery: intent.cleanQuery,
      inferredCategoryIds: intent.inferredCategoryIds,
      inferredBrandIds: intent.inferredBrandIds,
      inferredIntentGroup: intent.intentGroup,
      retrievalStrategy: intent.strategy,
      totalHits: result.totalHits,
      products: (result.hits ?? []).map((hit: any) => ({
        id: hit.id,
        name: hit.name,
        slug: hit.slug,
        description: hit.description ?? '',
        semanticText: hit.semanticText ?? '',
        image: hit.image ?? null,
        minPrice: hit.minPrice ?? 0,
        maxPrice: hit.maxPrice ?? 0,
        inStock: hit.inStock ?? false,
        totalStock: hit.totalStock ?? 0,
        rating: hit.rating ?? 0,
        reviewCount: hit.reviewCount ?? 0,
        brandId: hit.brandId,
        brandName: hit.brandName,
        categoryId: hit.categoryId,
        categoryName: hit.categoryName,
        isFeatured: hit.isFeatured ?? false,
        createdAt: hit.createdAt ?? 0,
        matchedVariantCount: hit.matchedVariantCount ?? 0,
        matchedVariants: hit.matchedVariants ?? [],
      })),
    };
  }

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
        slug: String((b as any).slug ?? ''),
        logo: (b as any).logo ?? null,
      })),
      categorySuggestions: (categories as any[]).map((c: any) => ({
        id: String(c._id),
        name: String(c.name),
        slug: String((c as any).slug ?? ''),
        parentId: (c as any).parentId ? String((c as any).parentId) : null,
      })),
    };
  }

  async logClick(input: {
    productId: string;
    queryId?: string;
    q?: string;
    position?: number;
    userId?: string;
    sessionId?: string;
  }) {
    return this.clickLogModel.create({ ...input, timestamp: new Date() });
  }

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
      { $project: { _id: 0, day: '$_id', top: { $slice: ['$items', limit] } } },
      { $sort: { day: 1 } },
    ]);
  }

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
          $match: { timestamp: { $gte: since }, q: { $exists: true, $ne: '' } },
        },
        { $group: { _id: '$q', clicks: { $sum: 1 } } },
      ]),
    ]);

    const clickMap = new Map<string, number>();
    for (const r of clickAgg as any[]) {
      clickMap.set(String(r._id), Number(r.clicks ?? 0));
    }

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
