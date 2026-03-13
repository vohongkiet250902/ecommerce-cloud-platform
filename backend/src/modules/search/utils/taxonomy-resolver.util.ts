import { Model } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';
import { Brand } from '../../brands/schemas/brand.schema';

export type IntentGroup =
  | 'phone'
  | 'watch'
  | 'audio'
  | 'laptop'
  | 'tablet'
  | 'accessory'
  | 'unknown';

export interface CategoryNode {
  id: string;
  name: string;
  normalizedName: string;
  group: IntentGroup;
  aliases: string[];
  parentId?: string | null;
}

export interface BrandNode {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
}

export class TaxonomyResolver {
  private categories: CategoryNode[] = [];
  private brands: BrandNode[] = [];
  private isLoaded = false;

  private categoriesById = new Map<string, CategoryNode>();
  private childrenByParent = new Map<string, string[]>();

  constructor(
    private readonly categoryModel: Model<Category>,
    private readonly brandModel: Model<Brand>,
  ) {}

  public normalize(text: string): string {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private containsPhrase(text: string, phrase: string): boolean {
    const normalizedText = ` ${this.normalize(text)} `;
    const normalizedPhrase = ` ${this.normalize(phrase)} `;
    return normalizedText.includes(normalizedPhrase);
  }

  private assignGroup(normalizedName: string): IntentGroup {
    if (/(dong ho|watch)/.test(normalizedName)) return 'watch';

    if (
      /(tai nghe|headphone|earphone|earbuds|airpods|earpods|buds|audio)/.test(
        normalizedName,
      )
    ) {
      return 'audio';
    }

    if (/(tablet|ipad|galaxy tab|may tinh bang|\btab\b)/.test(normalizedName)) {
      return 'tablet';
    }

    if (
      /(laptop|macbook|notebook|vivobook|inspiron|tuf|loq|may tinh xach tay)/.test(
        normalizedName,
      )
    ) {
      return 'laptop';
    }

    if (
      /(pin du phong|powerbank|cap sac|cu sac|bo sac|adapter|charger|cap & sac|cap va sac|phu kien)/.test(
        normalizedName,
      )
    ) {
      return 'accessory';
    }

    if (
      /^(asus|acer|dell|hp|lenovo|msi|gigabyte|razer|huawei|lg)$/.test(
        normalizedName,
      )
    ) {
      return 'laptop';
    }

    if (
      /^(apple|samsung|xiaomi|oppo|vivo|realme|honor|oneplus|nokia)$/.test(
        normalizedName,
      )
    ) {
      return 'phone';
    }

    if (
      /(dien thoai|phone|smartphone|mobile|iphone|galaxy s|galaxy z|reno|find x|redmi)/.test(
        normalizedName,
      )
    ) {
      return 'phone';
    }

    return 'unknown';
  }

  private buildCategoryAliases(normalizedName: string): string[] {
    const aliases = new Set<string>([normalizedName]);

    switch (normalizedName) {
      case 'pin du phong':
        ['sac du phong', 'pin sac du phong', 'power bank', 'powerbank'].forEach(
          (x) => aliases.add(x),
        );
        break;

      case 'cap & sac':
      case 'cap va sac':
        ['cap sac', 'cu sac', 'bo sac', 'charger', 'adapter', 'cable'].forEach(
          (x) => aliases.add(x),
        );
        break;

      case 'tai nghe':
        ['headphone', 'earphone', 'earbuds', 'buds', 'airpods'].forEach((x) =>
          aliases.add(x),
        );
        break;

      case 'apple watch':
        ['dong ho apple', 'watch apple'].forEach((x) => aliases.add(x));
        break;

      case 'galaxy watch':
        ['dong ho samsung', 'samsung watch'].forEach((x) => aliases.add(x));
        break;

      case 'xiaomi watch':
        ['dong ho xiaomi', 'redmi watch'].forEach((x) => aliases.add(x));
        break;

      case 'dien thoai':
        [
          'smartphone',
          'phone',
          'mobile',
          'dien thoai thong minh',
          'dt',
        ].forEach((x) => aliases.add(x));
        break;

      default:
        break;
    }

    return Array.from(aliases);
  }

  private buildBrandAliases(normalizedName: string): string[] {
    const aliases = new Set<string>([normalizedName]);

    switch (normalizedName) {
      case 'apple':
        [
          'iphone',
          'ipad',
          'macbook',
          'airpods',
          'apple watch',
          'earpods',
        ].forEach((x) => aliases.add(x));
        break;
      case 'samsung':
        [
          'galaxy',
          'galaxy s',
          'galaxy z',
          'galaxy watch',
          'galaxy tab',
          'buds',
        ].forEach((x) => aliases.add(x));
        break;
      case 'xiaomi':
        ['redmi', 'redmi note', 'xiaomi watch', 'redmi watch'].forEach((x) =>
          aliases.add(x),
        );
        break;
      case 'oppo':
        ['reno', 'find x'].forEach((x) => aliases.add(x));
        break;
      case 'anker':
        ['maggo'].forEach((x) => aliases.add(x));
        break;
      default:
        break;
    }

    return Array.from(aliases);
  }

  private computeInheritedGroup(
    categoryId: string,
    ownGroupById: Map<string, IntentGroup>,
    parentById: Map<string, string | null>,
    visiting = new Set<string>(),
  ): IntentGroup {
    const own = ownGroupById.get(categoryId) ?? 'unknown';
    if (own !== 'unknown') return own;

    if (visiting.has(categoryId)) return 'unknown';
    visiting.add(categoryId);

    const parentId = parentById.get(categoryId);
    if (!parentId) return 'unknown';

    return this.computeInheritedGroup(
      parentId,
      ownGroupById,
      parentById,
      visiting,
    );
  }

  private rebuildCategoryGraph() {
    this.categoriesById = new Map();
    this.childrenByParent = new Map();

    for (const cat of this.categories) {
      this.categoriesById.set(cat.id, cat);

      const parentId = cat.parentId ?? null;
      if (!parentId) continue;

      const current = this.childrenByParent.get(parentId) ?? [];
      current.push(cat.id);
      this.childrenByParent.set(parentId, current);
    }
  }

  expandCategoryIds(ids: string[]): string[] {
    const out = new Set<string>();
    const queue = [...ids];

    while (queue.length > 0) {
      const current = String(queue.shift() ?? '');
      if (!current || out.has(current)) continue;

      out.add(current);

      const children = this.childrenByParent.get(current) ?? [];
      for (const childId of children) {
        if (!out.has(childId)) queue.push(childId);
      }
    }

    return Array.from(out);
  }

  async loadTaxonomy() {
    const [cats, brds] = await Promise.all([
      this.categoryModel.find().select('name parentId').lean(),
      this.brandModel.find().select('name').lean(),
    ]);

    const ownGroupById = new Map<string, IntentGroup>();
    const parentById = new Map<string, string | null>();

    for (const c of cats as any[]) {
      const id = String(c._id);
      const normalizedName = this.normalize(c.name);
      ownGroupById.set(id, this.assignGroup(normalizedName));
      parentById.set(id, c.parentId ? String(c.parentId) : null);
    }

    this.categories = (cats as any[]).map((c) => {
      const id = String(c._id);
      const normalizedName = this.normalize(c.name);
      const inheritedGroup = this.computeInheritedGroup(
        id,
        ownGroupById,
        parentById,
      );

      return {
        id,
        name: String(c.name),
        normalizedName,
        group: inheritedGroup,
        aliases: this.buildCategoryAliases(normalizedName),
        parentId: c.parentId ? String(c.parentId) : null,
      };
    });

    this.rebuildCategoryGraph();

    this.brands = (brds as any[]).map((b) => {
      const normalizedName = this.normalize(b.name);
      return {
        id: String(b._id),
        name: String(b.name),
        normalizedName,
        aliases: this.buildBrandAliases(normalizedName),
      };
    });

    this.isLoaded = true;
  }

  getCategoryIdsByGroup(group: IntentGroup): string[] {
    return Array.from(
      new Set(
        this.categories.filter((c) => c.group === group).map((c) => c.id),
      ),
    );
  }

  getCategoryIdsByExactName(normalizedQuery: string): string[] {
    const q = this.normalize(normalizedQuery);
    if (!q) return [];

    const matchedIds = this.categories
      .filter((c) =>
        c.aliases.some(
          (alias) =>
            this.normalize(alias) === q ||
            this.containsPhrase(this.normalize(alias), q),
        ),
      )
      .map((c) => c.id);

    return this.expandCategoryIds(matchedIds);
  }

  findCategoriesInQuery(normalizedQuery: string): CategoryNode[] {
    const q = this.normalize(normalizedQuery);

    return this.categories.filter((category) =>
      category.aliases.some((alias) => {
        const escaped = this.escapeRegex(this.normalize(alias));
        return new RegExp(`\\b${escaped}\\b`, 'i').test(q);
      }),
    );
  }

  findBrandsInQuery(normalizedQuery: string): BrandNode[] {
    const q = this.normalize(normalizedQuery);
    return this.brands.filter((brand) =>
      brand.aliases.some((alias) => {
        const escaped = this.escapeRegex(this.normalize(alias));
        return new RegExp(`\\b${escaped}\\b`, 'i').test(q);
      }),
    );
  }

  get isReady() {
    return this.isLoaded;
  }
}
