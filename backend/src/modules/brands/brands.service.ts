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
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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

  async create(dto: CreateBrandDto) {
    const exists = await this.brandModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');

    const brand = await this.brandModel.create(dto);
    await this.clearCache();
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    // Fix: Kiểm tra trùng slug nếu user có update trường slug
    if (dto.slug) {
      const existing = await this.brandModel.findOne({
        slug: dto.slug,
        _id: { $ne: id }, // Loại trừ chính brand hiện tại đang update
      });
      if (existing) throw new BadRequestException('Slug already exists');
    }

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

  // Tối ưu User query (Chỉ lấy con số, không lấy nguyên mảng data)
  async findAllWithCounts() {
    return this.brandModel.aggregate([
      { $match: { isActive: true } },
      { $addFields: { brandIdString: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'products',
          let: { bId: '$brandIdString' },
          pipeline: [
            { $match: { $expr: { $eq: ['$brandId', '$$bId'] } } },
            { $count: 'totalProducts' },
          ],
          as: 'productsCountData',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          logo: 1,
          isActive: 1,
          productCount: {
            $ifNull: [
              { $arrayElemAt: ['$productsCountData.totalProducts', 0] },
              0,
            ],
          },
        },
      },
      { $sort: { name: 1 } },
    ]);
  }

  // Tối ưu Admin query
  async findAllForAdmin() {
    return this.brandModel.aggregate([
      { $addFields: { brandIdString: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'products',
          let: { bId: '$brandIdString' },
          pipeline: [
            { $match: { $expr: { $eq: ['$brandId', '$$bId'] } } },
            { $count: 'totalProducts' },
          ],
          as: 'productsCountData',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          logo: 1,
          isActive: 1,
          createdAt: 1, // Admin thường cần xem ngày tạo
          productCount: {
            $ifNull: [
              { $arrayElemAt: ['$productsCountData.totalProducts', 0] },
              0,
            ],
          },
        },
      },
      { $sort: { name: 1 } },
    ]);
  }
}
