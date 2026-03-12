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

    // category đặt tên theo brand nhưng thực chất là nhóm laptop
    if (
      /^(asus|acer|dell|hp|lenovo|msi|gigabyte|razer|huawei|lg)$/.test(
        normalizedName,
      )
    ) {
      return 'laptop';
    }

    // category đặt tên theo brand nhưng thực chất là nhóm điện thoại
    if (/^(apple|samsung|xiaomi|oppo)$/.test(normalizedName)) return 'phone';

    if (
      /(dien thoai|phone|smartphone|mobile|iphone|galaxy s|galaxy z|reno|find x|redmi)/.test(
        normalizedName,
      )
    ) {
      return 'phone';
    }

    return 'unknown';
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

  async loadTaxonomy() {
    const [cats, brds] = await Promise.all([
      this.categoryModel.find().select('name').lean(),
      this.brandModel.find().select('name').lean(),
    ]);

    this.categories = (cats as any[]).map((c) => {
      const normalizedName = this.normalize(c.name);
      return {
        id: String(c._id),
        name: String(c.name),
        normalizedName,
        group: this.assignGroup(normalizedName),
      };
    });

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
    return this.categories.filter((c) => c.group === group).map((c) => c.id);
  }

  getCategoryIdsByExactName(normalizedQuery: string): string[] {
    const q = this.normalize(normalizedQuery);
    if (!q) return [];
    return this.categories
      .filter(
        (c) =>
          c.normalizedName === q || this.containsPhrase(c.normalizedName, q),
      )
      .map((c) => c.id);
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
