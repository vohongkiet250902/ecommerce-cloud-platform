import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SeedSearchDemoCommand } from './seed-search-demo.command';

// ⚠️ Sửa path import cho đúng project bạn
import {
  Product,
  ProductSchema,
} from '../modules/products/schemas/product.schema';
import { Brand, BrandSchema } from '../modules/brands/schemas/brand.schema';
import {
  Category,
  CategorySchema,
} from '../modules/categories/schemas/category.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // dùng đúng env Mongo của app bạn (MONGODB_URI / URL_MONGODB tuỳ dự án)
    MongooseModule.forRoot(
      process.env.URL_MONGODB || process.env.MONGODB_URI || '',
    ),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [SeedSearchDemoCommand],
})
export class SeedSearchDemoModule {}
