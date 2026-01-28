import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto'; // Import DTO vừa tạo

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const exists = await this.categoryModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug đã tồn tại');

    return this.categoryModel.create({
      name: dto.name,
      slug: dto.slug,
      parentId: null,
    });
  }

  async update(id: string, dto: any) {
    const updateData = {
      name: dto.name,
      slug: dto.slug,
      isActive: dto.isActive,
    };

    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      },
    );

    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  async remove(id: string) {
    // Kiểm tra ràng buộc: Không xóa nếu có con
    const hasChildren = await this.categoryModel.findOne({ parentId: id });
    if (hasChildren) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang chứa danh mục con',
      );
    }
    return this.categoryModel.findByIdAndDelete(id);
  }

  async findAll() {
    return this.categoryModel
      .find({ parentId: null, isActive: true })
      .populate({
        path: 'children',
        match: { isActive: true },
        populate: { path: 'children' },
      })
      .sort({ name: 1 })
      .exec();
  }
}
