import { TaxonomyResolver, IntentGroup } from './taxonomy-resolver.util';

export type RetrievalStrategy = 'filter-only' | 'query+filter' | 'full-text';

export interface AnalyzedIntent {
  originalQuery: string;
  normalizedQuery: string;
  inferredCategoryIds: string[];
  inferredBrandIds: string[];
  intentGroup?: IntentGroup;
  strategy: RetrievalStrategy;
  cleanQuery: string;
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

  analyze(rawQuery: string): AnalyzedIntent {
    const normalizedQuery = this.taxonomy.normalize(rawQuery);
    let strategy: RetrievalStrategy = 'full-text';
    let intentGroup: IntentGroup | undefined;
    let cleanQuery = normalizedQuery;
    let inferredCategoryIds: string[] = [];

    const matchedBrands = this.taxonomy.findBrandsInQuery(normalizedQuery);
    const inferredBrandIds = matchedBrands.map((b) => b.id);
    const matchedBrandAliases = matchedBrands.flatMap((b) => b.aliases ?? []);

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
      cleanQuery = this.removePhrases(cleanQuery, [
        ...this.groupKeywords[intentGroup],
        ...matchedBrandAliases,
      ]);

      const hasAnyResolvedFilter =
        inferredCategoryIds.length > 0 || inferredBrandIds.length > 0;

      if (hasAnyResolvedFilter) {
        strategy = cleanQuery === '' ? 'filter-only' : 'query+filter';
      } else {
        // Không suy ra được taxonomy thật sự thì tuyệt đối không được ép về filter-only,
        // nếu không backend sẽ tự trả về 0 hits.
        strategy = 'full-text';
        cleanQuery = normalizedQuery;
        intentGroup = undefined;
      }
    } else {
      const exactCatIds =
        this.taxonomy.getCategoryIdsByExactName(normalizedQuery);
      if (exactCatIds.length > 0) {
        inferredCategoryIds = exactCatIds;
        cleanQuery = this.removePhrases(cleanQuery, matchedBrandAliases);
        strategy = cleanQuery === '' ? 'filter-only' : 'query+filter';
      } else if (matchedBrands.length > 0) {
        cleanQuery = this.removePhrases(cleanQuery, matchedBrandAliases);
        strategy = cleanQuery === '' ? 'filter-only' : 'query+filter';
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
