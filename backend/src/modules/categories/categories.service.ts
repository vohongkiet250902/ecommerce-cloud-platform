import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  async create(dto: any) {
    const exists = await this.categoryModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');
    return this.categoryModel.create(dto);
  }

  async update(id: string, dto: any) {
    const category = await this.categoryModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: string) {
    return this.categoryModel.findByIdAndDelete(id);
  }

  async findAll() {
    return this.categoryModel.find({ isActive: true }).sort({ name: 1 });
  }
}
