import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const exists = await this.categoryModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug đã tồn tại');

    // Nếu có parentId thì validate parent tồn tại
    if (dto.parentId) {
      if (!Types.ObjectId.isValid(dto.parentId as any)) {
        throw new BadRequestException('parentId không hợp lệ');
      }

      const parent = await this.categoryModel.findById(dto.parentId);
      if (!parent) throw new BadRequestException('parentId không tồn tại');
    }

    return this.categoryModel.create({
      name: dto.name,
      slug: dto.slug,
      parentId: dto.parentId || null,
      filterableAttributes: dto.filterableAttributes || [],
    });
  }

  /**
   * Chặn cycle: không cho set parentId vào chính nó hoặc vào con/cháu của nó.
   * Ý tưởng: đi ngược lên từ newParentId -> parentId -> ... nếu gặp categoryId => cycle.
   */
  private async assertNoCycle(categoryId: string, newParentId: string) {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'parentId không hợp lệ (gây vòng lặp category)',
        );
      }

      const node = await this.categoryModel
        .findById(currentId)
        .select('parentId')
        .lean();

      // parent không tồn tại -> đã được check ở ngoài, nhưng giữ cho chắc
      if (!node) {
        throw new BadRequestException('parentId không tồn tại');
      }

      currentId = node.parentId ? String(node.parentId) : null;
    }
  }

  async update(id: string, dto: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const current = await this.categoryModel.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy danh mục');

    // 1) Check slug unique nếu có update slug
    if (dto.slug && dto.slug !== current.slug) {
      const exists = await this.categoryModel.findOne({
        slug: dto.slug,
        _id: { $ne: id },
      });
      if (exists) throw new BadRequestException('Slug đã tồn tại');
    }

    // 2) Xử lý parentId (đổi cha)
    // - Nếu dto.parentId === undefined: không đổi
    // - Nếu dto.parentId === null: set về root
    // - Nếu dto.parentId có giá trị: validate + chống cycle
    let parentIdToSet: Types.ObjectId | null | undefined = undefined;

    if (dto.parentId !== undefined) {
      if (dto.parentId === null || dto.parentId === '') {
        parentIdToSet = null;
      } else {
        if (!Types.ObjectId.isValid(dto.parentId)) {
          throw new BadRequestException('parentId không hợp lệ');
        }

        const newParentId = String(dto.parentId);

        // self-parent
        if (newParentId === String(id)) {
          throw new BadRequestException('parentId không thể là chính nó');
        }

        const parent = await this.categoryModel.findById(newParentId);
        if (!parent) throw new BadRequestException('parentId không tồn tại');

        // chống cycle (đặt cha là con/cháu)
        await this.assertNoCycle(String(id), newParentId);

        parentIdToSet = new Types.ObjectId(newParentId);
      }
    }

    const updateData: any = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.filterableAttributes !== undefined
        ? { filterableAttributes: dto.filterableAttributes }
        : {}),
      ...(parentIdToSet !== undefined ? { parentId: parentIdToSet } : {}),
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
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const hasChildren = await this.categoryModel.findOne({ parentId: id });
    if (hasChildren) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang chứa danh mục con',
      );
    }

    const deleted = await this.categoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Không tìm thấy danh mục');
    return deleted;
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
