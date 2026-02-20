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
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
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

  async remove(id: string) {
    return this.brandModel.findByIdAndDelete(id);
  }

  async findAll() {
    return this.brandModel.find({ isActive: true }).sort({ name: 1 });
  }

  async findAllWithCounts() {
    return this.brandModel.aggregate([
      {
        $match: { isActive: true },
      },
      // BƯỚC MỚI: Ép kiểu _id từ ObjectId sang String
      {
        $addFields: {
          brandIdString: { $toString: '$_id' },
        },
      },
      {
        $lookup: {
          from: 'products', // Tên collection products
          localField: 'brandIdString', // Sử dụng trường String vừa tạo để so sánh
          foreignField: 'brandId', // Trường String bên products
          as: 'productsData',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          logo: 1,
          isActive: 1,
          productCount: { $size: '$productsData' }, // Đếm mảng productsData
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);
  }
}
