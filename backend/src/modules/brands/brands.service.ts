import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand } from './schemas/brand.schema';
import { Product } from '../products/schemas/product.schema';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async create(dto: any) {
    const exists = await this.brandModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');
    return this.brandModel.create(dto);
  }

  async update(id: string, dto: any) {
    const brand = await this.brandModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async updateStatus(id: string, isActive: boolean) {
    const brand = await this.brandModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );
    if (!brand) throw new NotFoundException('Brand not found');
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
