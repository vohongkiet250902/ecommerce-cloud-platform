import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchAdminController } from './search-admin.controller';
import { SearchReindexController } from './search-reindex.controller';
import { SearchLog, SearchLogSchema } from './schemas/search-log.schema';
import { ClickLog, ClickLogSchema } from './schemas/click-log.schema';

import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Brand, BrandSchema } from '../brands/schemas/brand.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SearchLog.name, schema: SearchLogSchema },
      { name: ClickLog.name, schema: ClickLogSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [
    SearchController,
    SearchAdminController,
    SearchReindexController,
  ],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
