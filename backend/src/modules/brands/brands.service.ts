import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand } from './schemas/brand.schema';
import { Product } from '../products/schemas/product.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async clearCache() {
    await this.cacheManager.del('brands_public_list');
  }

  async create(dto: any) {
    const exists = await this.brandModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');
    const brand = await this.brandModel.create(dto);
    await this.clearCache();
    return brand;
  }

  async update(id: string, dto: any) {
    const brand = await this.brandModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!brand) throw new NotFoundException('Brand not found');
    await this.clearCache();
    return brand;
  }

  async updateStatus(id: string, isActive: boolean) {
    const brand = await this.brandModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );
    if (!brand) throw new NotFoundException('Brand not found');
    await this.clearCache();
    return brand;
  }

  async remove(id: string) {
    const hasInStockProducts = await this.productModel.exists({
      brandId: String(id),
      totalStock: { $gt: 0 },
    });

    if (hasInStockProducts) {
      throw new BadRequestException(
        'Thương hiệu vẫn còn sản phẩm tồn kho, vui lòng chuyển sang inactive thay vì xóa.',
      );
    }

    const deleted = await this.brandModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Brand not found');
    await this.clearCache();
    return deleted;
  }

  // User query (Chỉ active)
  async findAllWithCounts() {
    return this.brandModel.aggregate([
      { $match: { isActive: true } },
      { $addFields: { brandIdString: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'products',
          localField: 'brandIdString',
          foreignField: 'brandId',
          as: 'productsData',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          logo: 1,
          isActive: 1,
          productCount: { $size: '$productsData' },
        },
      },
      { $sort: { name: 1 } },
    ]);
  }

  // Admin query (Lấy hết)
  async findAllForAdmin() {
    return this.brandModel.aggregate([
      { $addFields: { brandIdString: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'products',
          localField: 'brandIdString',
          foreignField: 'brandId',
          as: 'productsData',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          logo: 1,
          isActive: 1,
          productCount: { $size: '$productsData' },
        },
      },
      { $sort: { name: 1 } },
    ]);
  }
}
