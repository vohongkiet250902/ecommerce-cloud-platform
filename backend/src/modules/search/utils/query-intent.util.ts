import { TaxonomyResolver, IntentGroup } from './taxonomy-resolver.util';

export type RetrievalStrategy = 'filter-only' | 'query+filter' | 'full-text';

export type ChatIntent =
  | 'product_search'
  | 'product_recommendation'
  | 'product_comparison'
  | 'policy_question'
  | 'mixed';

export interface AnalyzedIntent {
  originalQuery: string;
  normalizedQuery: string;
  inferredCategoryIds: string[];
  inferredBrandIds: string[];
  intentGroup?: IntentGroup;
  strategy: RetrievalStrategy;
  cleanQuery: string;
}

function normalizeLoose(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesAny(source: string, keywords: string[]): boolean {
  const normalizedSource = normalizeLoose(source);
  if (!normalizedSource) return false;

  return keywords.some((kw) => {
    const normalizedKw = normalizeLoose(kw);
    if (!normalizedKw) return false;

    return new RegExp(`\\b${escapeRegex(normalizedKw)}\\b`, 'i').test(
      normalizedSource,
    );
  });
}

export function detectChatIntent(rawMessage: string): ChatIntent {
  const q = normalizeLoose(rawMessage);

  const comparisonKeywords = [
    'so sanh',
    'khac nhau',
    'hon',
    'vs',
    'versus',
    'giua',
    'doi chieu',
    'chon con nao',
    'chon may nao',
  ];

  const recommendationKeywords = [
    'goi y',
    'tu van',
    'phu hop',
    'nen mua',
    'de xuat',
    'chon giup',
    'loai nao hop',
    'mau nao hop',
  ];

  const policyKeywords = [
    'doi tra',
    'bao hanh',
    'ship',
    'giao hang',
    'thanh toan',
    'cod',
    'tra gop',
    'hoan tien',
    'doi size',
    'chinh sach',
  ];

  const productKeywords = [
    'dien thoai',
    'iphone',
    'samsung',
    'xiaomi',
    'oppo',
    'vivo',
    'realme',
    'tai nghe',
    'headphone',
    'earbuds',
    'airpods',
    'dong ho',
    'watch',
    'laptop',
    'macbook',
    'tablet',
    'ipad',
    'phu kien',
    'sac',
    'cap',
    'powerbank',
    'power bank',
    'pin du phong',
    'sac du phong',
  ];

  const hasComparison = includesAny(q, comparisonKeywords);
  const hasRecommendation = includesAny(q, recommendationKeywords);
  const hasPolicy = includesAny(q, policyKeywords);
  const hasProductSignal =
    includesAny(q, productKeywords) || hasComparison || hasRecommendation;

  if (hasPolicy && hasProductSignal) return 'mixed';
  if (hasPolicy) return 'policy_question';
  if (hasComparison) return 'product_comparison';
  if (hasRecommendation) return 'product_recommendation';
  return 'product_search';
}

export class QueryIntentAnalyzer {
  constructor(private readonly taxonomy: TaxonomyResolver) {}

  private groupKeywords: Record<IntentGroup, string[]> = {
    phone: [
      'dien thoai',
      'smartphone',
      'phone',
      'mobile',
      'iphone',
      'galaxy s',
      'galaxy z',
      'redmi',
      'reno',
      'find x',
    ],
    watch: [
      'dong ho',
      'watch',
      'smartwatch',
      'dong ho thong minh',
      'apple watch',
      'galaxy watch',
      'xiaomi watch',
      'redmi watch',
    ],
    audio: [
      'tai nghe',
      'headphone',
      'earphone',
      'earbuds',
      'airpods',
      'earpods',
      'buds',
    ],
    laptop: [
      'laptop',
      'notebook',
      'may tinh xach tay',
      'macbook',
      'vivobook',
      'inspiron',
      'tuf',
      'loq',
    ],
    tablet: ['tablet', 'ipad', 'may tinh bang', 'galaxy tab', 'tab'],
    accessory: [
      'pin du phong',
      'powerbank',
      'cap sac',
      'cu sac',
      'bo sac',
      'charger',
      'adapter',
    ],
    unknown: [],
  };

  private conversationalStopWords = [
    'nao',
    'loai',
    'mau',
    'con',
    'cai',
    'giup',
    'toi',
    'minh',
    'voi',
    'nhe',
    'a',
    'ah',
    'ha',
    'nhi',
    'khong',
    'can',
    'muon',
    'tim',
    'nen',
    'mua',
    'goi',
    'y',
    'tu',
    'van',
    'tham',
    'khao',
  ];

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private removePhrases(source: string, phrases: string[]): string {
    let output = source;
    const sorted = Array.from(new Set(phrases.filter(Boolean))).sort(
      (a, b) => b.length - a.length,
    );

    for (const phrase of sorted) {
      const escaped = this.escapeRegex(this.taxonomy.normalize(phrase));
      output = output.replace(new RegExp(`\\b${escaped}\\b`, 'ig'), ' ');
    }

    return output.replace(/\s+/g, ' ').trim();
  }

  private removeStopWords(source: string): string {
    let output = ` ${source} `;

    for (const word of this.conversationalStopWords) {
      const escaped = this.escapeRegex(this.taxonomy.normalize(word));
      output = output.replace(new RegExp(`\\b${escaped}\\b`, 'ig'), ' ');
    }

    return output.replace(/\s+/g, ' ').trim();
  }

  private cleanupQueryForRetrieval(source: string): string {
    const cleaned = this.removeStopWords(source);
    return cleaned || source;
  }

  private isPureTaxonomyQuery(input: {
    normalizedQuery: string;
    intentGroup?: IntentGroup;
    matchedBrandAliases: string[];
    matchedCategoryAliases?: string[];
  }): boolean {
    let remainder = input.normalizedQuery;

    if (input.intentGroup) {
      remainder = this.removePhrases(
        remainder,
        this.groupKeywords[input.intentGroup],
      );
    }

    if (input.matchedCategoryAliases?.length) {
      remainder = this.removePhrases(remainder, input.matchedCategoryAliases);
    }

    remainder = this.removePhrases(remainder, input.matchedBrandAliases);
    remainder = this.removeStopWords(remainder);

    return remainder.trim() === '';
  }

  detectChatIntent(rawMessage: string): ChatIntent {
    return detectChatIntent(rawMessage);
  }

  analyze(rawQuery: string): AnalyzedIntent {
    const normalizedQuery = this.taxonomy.normalize(rawQuery);
    let strategy: RetrievalStrategy = 'full-text';
    let intentGroup: IntentGroup | undefined;
    let cleanQuery = normalizedQuery;
    let inferredCategoryIds: string[] = [];

    const matchedBrands = this.taxonomy.findBrandsInQuery(normalizedQuery);
    const inferredBrandIds = matchedBrands.map((b) => b.id);
    const matchedBrandAliases = Array.from(
      new Set(matchedBrands.flatMap((b) => b.aliases ?? [])),
    );

    const matchedCategories =
      this.taxonomy.findCategoriesInQuery(normalizedQuery);
    const matchedCategoryAliases = Array.from(
      new Set(matchedCategories.flatMap((c) => c.aliases ?? [])),
    );

    if (matchedCategories.length > 0) {
      inferredCategoryIds = this.taxonomy.expandCategoryIds(
        matchedCategories.map((c) => c.id),
      );
      intentGroup = matchedCategories[0]?.group;

      const stripped = this.removePhrases(normalizedQuery, [
        ...matchedCategoryAliases,
        ...matchedBrandAliases,
      ]);

      cleanQuery = this.cleanupQueryForRetrieval(stripped);

      strategy = this.isPureTaxonomyQuery({
        normalizedQuery,
        intentGroup,
        matchedBrandAliases,
        matchedCategoryAliases,
      })
        ? 'filter-only'
        : 'query+filter';
    } else {
      for (const [group, keywords] of Object.entries(this.groupKeywords)) {
        if (
          group !== 'unknown' &&
          keywords.some((kw) =>
            normalizedQuery.includes(this.taxonomy.normalize(kw)),
          )
        ) {
          intentGroup = group as IntentGroup;
          break;
        }
      }

      if (intentGroup) {
        inferredCategoryIds = this.taxonomy.getCategoryIdsByGroup(intentGroup);

        const hasAnyResolvedFilter =
          inferredCategoryIds.length > 0 || inferredBrandIds.length > 0;

        if (hasAnyResolvedFilter) {
          const stripped = this.removePhrases(
            normalizedQuery,
            matchedBrandAliases,
          );
          cleanQuery = this.cleanupQueryForRetrieval(stripped);

          strategy = this.isPureTaxonomyQuery({
            normalizedQuery,
            intentGroup,
            matchedBrandAliases,
          })
            ? 'filter-only'
            : 'query+filter';
        } else {
          strategy = 'full-text';
          cleanQuery = this.cleanupQueryForRetrieval(normalizedQuery);
          intentGroup = undefined;
        }
      } else {
        const exactCatIds =
          this.taxonomy.getCategoryIdsByExactName(normalizedQuery);

        if (exactCatIds.length > 0) {
          inferredCategoryIds = exactCatIds;

          const stripped = this.removePhrases(
            normalizedQuery,
            matchedBrandAliases,
          );
          cleanQuery = this.cleanupQueryForRetrieval(stripped);

          strategy = this.isPureTaxonomyQuery({
            normalizedQuery,
            matchedBrandAliases,
          })
            ? 'filter-only'
            : 'query+filter';
        } else if (matchedBrands.length > 0) {
          const stripped = this.removePhrases(
            normalizedQuery,
            matchedBrandAliases,
          );
          cleanQuery = this.cleanupQueryForRetrieval(stripped);

          strategy = this.isPureTaxonomyQuery({
            normalizedQuery,
            matchedBrandAliases,
          })
            ? 'filter-only'
            : 'query+filter';
        } else {
          cleanQuery = this.cleanupQueryForRetrieval(normalizedQuery);
        }
      }
    }

    return {
      originalQuery: rawQuery,
      normalizedQuery,
      inferredCategoryIds,
      inferredBrandIds,
      intentGroup,
      strategy,
      cleanQuery: strategy === 'filter-only' ? '' : cleanQuery,
    };
  }
}
