import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from './schemas/category.schema';
import { Product } from '../products/schemas/product.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const exists = await this.categoryModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug đã tồn tại');

    let parentId: Types.ObjectId | null = null;
    if (dto.parentId) {
      if (!Types.ObjectId.isValid(dto.parentId))
        throw new BadRequestException('parentId không hợp lệ');
      const parent = await this.categoryModel.findById(dto.parentId);
      if (!parent) throw new BadRequestException('parentId không tồn tại');
      parentId = new Types.ObjectId(dto.parentId);
    }

    return this.categoryModel.create({ ...dto, parentId });
  }

  private async assertNoCycle(categoryId: string, newParentId: string) {
    let currentId: string | null = newParentId;
    while (currentId) {
      if (currentId === categoryId)
        throw new BadRequestException('Gây vòng lặp category');
      const node = await this.categoryModel
        .findById(currentId)
        .select('parentId')
        .lean();
      if (!node) throw new BadRequestException('parentId không tồn tại');
      currentId = node.parentId ? String(node.parentId) : null;
    }
  }

  async update(id: string, dto: any) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('id không hợp lệ');
    const current = await this.categoryModel.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy danh mục');

    if (dto.slug && dto.slug !== current.slug) {
      const exists = await this.categoryModel.findOne({
        slug: dto.slug,
        _id: { $ne: id },
      });
      if (exists) throw new BadRequestException('Slug đã tồn tại');
    }

    let parentIdToSet: Types.ObjectId | null | undefined = undefined;
    if (dto.parentId !== undefined) {
      if (dto.parentId === null || dto.parentId === '') parentIdToSet = null;
      else {
        if (!Types.ObjectId.isValid(dto.parentId))
          throw new BadRequestException('parentId không hợp lệ');
        const newParentId = String(dto.parentId);
        if (newParentId === String(id))
          throw new BadRequestException('Không thể là chính nó');
        const parent = await this.categoryModel.findById(newParentId);
        if (!parent) throw new BadRequestException('parentId không tồn tại');
        await this.assertNoCycle(String(id), newParentId);
        parentIdToSet = new Types.ObjectId(newParentId);
      }
    }

    const updateData = {
      ...dto,
      ...(parentIdToSet !== undefined ? { parentId: parentIdToSet } : {}),
    };
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  async updateStatus(id: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('id không hợp lệ');
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('id không hợp lệ');

    // 1. Kiểm tra danh mục con (Dùng thẳng id để Mongoose tự cast)
    const hasChildren = await this.categoryModel.exists({ parentId: id });
    if (hasChildren)
      throw new BadRequestException(
        'Không thể xóa danh mục đang chứa danh mục con',
      );

    // 2. Kiểm tra hàng tồn kho (Dùng thẳng id)
    const hasInStockProducts = await this.productModel.exists({
      categoryId: id,
      totalStock: { $gt: 0 },
    });

    if (hasInStockProducts)
      throw new BadRequestException(
        'Danh mục vẫn còn sản phẩm tồn kho, vui lòng chuyển sang inactive.',
      );

    // 3. Xóa danh mục (Lệnh xóa của Mongoose vẫn cần ObjectId hoặc id đều được)
    const deleted = await this.categoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Không tìm thấy danh mục');

    return deleted;
  }

  private async buildCategoryTree(forAdmin: boolean) {
    const matchCondition = forAdmin
      ? { parentId: null }
      : { parentId: null, isActive: true };
    const populateMatch = forAdmin ? {} : { isActive: true };

    const categories = await this.categoryModel
      .find(matchCondition)
      .populate({
        path: 'children',
        match: populateMatch,
        populate: { path: 'children', match: populateMatch },
      })
      .sort({ name: 1 })
      .lean()
      .exec();

    const productCounts = await this.productModel.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    productCounts.forEach((pc) => {
      if (pc._id) countMap.set(String(pc._id), pc.count);
    });

    const calculateCountAndMap = (category: any) => {
      let totalCount = countMap.get(String(category._id)) || 0;
      if (category.children && category.children.length > 0) {
        category.children.forEach((child: any) => {
          totalCount += calculateCountAndMap(child);
        });
      }
      category.productCount = totalCount;
      return totalCount;
    };

    categories.forEach((cat) => calculateCountAndMap(cat));
    return categories;
  }

  async findAll() {
    return this.buildCategoryTree(false);
  }
  async findAllForAdmin() {
    return this.buildCategoryTree(true);
  }
}
