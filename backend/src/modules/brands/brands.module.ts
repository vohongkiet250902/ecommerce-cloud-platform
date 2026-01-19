import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { AdminBrandsController } from './admin-brands.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
  ],
  controllers: [BrandsController, AdminBrandsController],
  providers: [BrandsService],
})
export class BrandsModule {}
