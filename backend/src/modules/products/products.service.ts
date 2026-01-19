import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { SortOrder } from 'mongoose';
@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  async create(dto: any) {
    const exists = await this.productModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');

    return this.productModel.create(dto);
  }

  async update(id: string, dto: any) {
    const product = await this.productModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string) {
    return this.productModel.findByIdAndDelete(id);
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, status: 'active' })
      .populate('categoryId')
      .populate('brandId');

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, category, brand, sort } = query;

    const filter: any = { status: 'active' };
    if (category) filter.categoryId = category;
    if (brand) filter.brandId = brand;

    // ✅ KHAI BÁO 1 LẦN DUY NHẤT
    let sortOption: Record<string, SortOrder> = {
      createdAt: -1,
    };

    if (sort === 'price_asc') {
      sortOption = { 'variants.price': 1 };
    }

    if (sort === 'price_desc') {
      sortOption = { 'variants.price': -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      this.productModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
}
