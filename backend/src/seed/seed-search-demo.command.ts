import { Command, CommandRunner, Option } from 'nest-commander';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// ⚠️ Sửa path import cho đúng project bạn
import { Product } from '../modules/products/schemas/product.schema';
import { Brand } from '../modules/brands/schemas/brand.schema';
import { Category } from '../modules/categories/schemas/category.schema';

type SeedOptions = {
  purge?: boolean;
  count?: number;
};

@Command({
  name: 'seed:search-demo',
  description:
    'Seed 5 categories, 10 brands, 50 products with variants/specs for search facets demo',
})
export class SeedSearchDemoCommand extends CommandRunner {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
  ) {
    super();
  }

  @Option({ flags: '--purge', description: 'Delete existing demo data first' })
  parsePurge(val?: string) {
    return val === undefined ? true : String(val).toLowerCase() !== 'false';
  }

  @Option({
    flags: '--count [number]',
    description: 'Number of products (default 50)',
  })
  parseCount(val?: string) {
    const n = Number(val ?? 50);
    return Number.isFinite(n) ? n : 50;
  }

  async run(_: string[], options: SeedOptions) {
    const purge = options.purge ?? true;
    const count = Math.max(10, Math.min(200, options.count ?? 50));

    const tag = 'SEARCH_DEMO';

    if (purge) {
      await Promise.all([
        this.productModel.deleteMany({ __seedTag: tag } as any),
        this.brandModel.deleteMany({ __seedTag: tag } as any),
        this.categoryModel.deleteMany({ __seedTag: tag } as any),
      ]);
    }

    // 1) Seed Categories
    const categoryNames = [
      'Điện thoại',
      'Tai nghe',
      'Sạc & Cáp',
      'Ốp lưng',
      'Laptop',
    ];
    const categories = await this.categoryModel.insertMany(
      categoryNames.map((name, i) => ({
        name,
        slug: this.slugify(name),
        isActive: true, // ⚠️ nếu schema dùng "status" thì đổi
        __seedTag: tag,
        sortOrder: i,
      })) as any,
    );

    // 2) Seed Brands
    const brandNames = [
      'Apple',
      'Samsung',
      'Xiaomi',
      'OPPO',
      'Sony',
      'JBL',
      'Anker',
      'Baseus',
      'Logitech',
      'Asus',
    ];
    const brands = await this.brandModel.insertMany(
      brandNames.map((name) => ({
        name,
        slug: this.slugify(name),
        isActive: true, // ⚠️ nếu schema dùng "status" thì đổi
        __seedTag: tag,
      })) as any,
    );

    // helper pick
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    // 3) Seed Products
    const colors = ['black', 'white', 'blue', 'red'];
    const storages = ['64gb', '128gb', '256gb', '512gb'];
    const rams = ['8gb', '16gb', '32gb'];
    const connectivities = ['bluetooth', 'usb-c', 'lightning'];
    const types = ['wired', 'wireless', 'fast-charge'];

    const makeVariants = (basePrice: number) => {
      const n = 2 + Math.floor(Math.random() * 3); // 2-4 variants
      const variants: any[] = [];

      for (let i = 0; i < n; i++) {
        const price = basePrice + i * (basePrice * 0.12);
        const discountPercentage = [0, 5, 10, 15][
          Math.floor(Math.random() * 4)
        ];
        const finalPrice = Math.round(price * (1 - discountPercentage / 100));
        const stock =
          Math.random() < 0.15 ? 0 : 5 + Math.floor(Math.random() * 50);

        variants.push({
          sku: `SKU-${Math.random().toString(16).slice(2, 10).toUpperCase()}-${i}`,
          price: Math.round(price),
          discountPercentage,
          finalPrice,
          stock,
          status: Math.random() < 0.1 ? 'inactive' : 'active',
          attributes: [
            { key: 'color', value: pick(colors) },
            { key: 'storage', value: pick(storages) },
            { key: 'ram', value: pick(rams) },
          ],
        });
      }
      return variants;
    };

    const docs: any[] = [];
    for (let i = 0; i < count; i++) {
      const cat = pick(categories as any[]);
      const brand = pick(brands as any[]);

      const baseName = this.makeProductName(cat.name, brand.name, i);
      const basePrice =
        cat.name === 'Điện thoại'
          ? 12000000 + Math.floor(Math.random() * 18000000)
          : cat.name === 'Laptop'
            ? 15000000 + Math.floor(Math.random() * 25000000)
            : 200000 + Math.floor(Math.random() * 2500000);

      const variants = makeVariants(basePrice);

      // totalStock (để đúng schema bạn đang dùng)
      const totalStock = variants
        .filter((v) => v.status === 'active')
        .reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);

      // specs cấp product (để attributePairs có nhiều keys hơn)
      const specs = [
        { key: 'connectivity', value: pick(connectivities) },
        { key: 'type', value: pick(types) },
      ];

      docs.push({
        name: baseName,
        slug: this.slugify(baseName) + '-' + (i + 1),
        description: `Demo product for search facets: ${baseName}`,
        categoryId: new Types.ObjectId(cat._id),
        brandId: new Types.ObjectId(brand._id),
        images: [
          {
            url:
              'https://picsum.photos/seed/' +
              encodeURIComponent(baseName) +
              '/640/640',
          },
        ],
        variants,
        specs,
        totalStock,
        status: Math.random() < 0.08 ? 'inactive' : 'active',
        isFeatured: Math.random() < 0.18,
        averageRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        reviewCount: 5 + Math.floor(Math.random() * 400),
        __seedTag: tag,
      });
    }

    await this.productModel.insertMany(docs);

    // Summary
    const [pCount, bCount, cCount] = await Promise.all([
      this.productModel.countDocuments({ __seedTag: tag } as any),
      this.brandModel.countDocuments({ __seedTag: tag } as any),
      this.categoryModel.countDocuments({ __seedTag: tag } as any),
    ]);

    // eslint-disable-next-line no-console
    console.log(
      `✅ Seed done: products=${pCount}, brands=${bCount}, categories=${cCount}`,
    );
    // eslint-disable-next-line no-console
    console.log(`Next: call POST /admin/search/reindex-products?purge=true`);
  }

  private slugify(s: string) {
    return String(s)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private makeProductName(categoryName: string, brandName: string, i: number) {
    if (categoryName === 'Điện thoại') {
      const models = [
        'iPhone 15',
        'iPhone 15 Pro',
        'Galaxy S24',
        'Redmi Note 13',
        'OPPO Reno 11',
      ];
      return `${brandName} ${models[i % models.length]} ${i % 2 === 0 ? 'New' : '2025'}`;
    }
    if (categoryName === 'Tai nghe') {
      const models = ['AirPods', 'WH-1000XM', 'Tune', 'Life P', 'TWS'];
      return `${brandName} ${models[i % models.length]} Earbuds ${i + 1}`;
    }
    if (categoryName === 'Sạc & Cáp') {
      const models = ['Charger', 'Cable', 'Adapter', 'FastCharge', 'GaN'];
      return `${brandName} ${models[i % models.length]} ${i + 1}`;
    }
    if (categoryName === 'Ốp lưng') {
      const models = ['Case', 'Armor', 'Silicone', 'Clear', 'MagSafe'];
      return `${brandName} ${models[i % models.length]} for iPhone ${(i % 5) + 11}`;
    }
    // Laptop
    const models = ['Vivobook', 'Zenbook', 'ROG', 'MacBook', 'IdeaPad'];
    return `${brandName} ${models[i % models.length]} ${i + 1}`;
  }
}
