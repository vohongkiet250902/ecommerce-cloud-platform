import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Product } from '../products/schemas/product.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const exists = await this.categoryModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug đã tồn tại');

    let parentId: Types.ObjectId | null = null;

    if (dto.parentId) {
      if (!Types.ObjectId.isValid(dto.parentId)) {
        throw new BadRequestException('parentId không hợp lệ');
      }

      const parent = await this.categoryModel.findById(dto.parentId);
      if (!parent) throw new BadRequestException('parentId không tồn tại');

      parentId = new Types.ObjectId(dto.parentId); // ✅ ép kiểu
    }

    return this.categoryModel.create({
      name: dto.name,
      slug: dto.slug,
      parentId, // ✅ ObjectId hoặc null
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

    const oid = new Types.ObjectId(id);

    const hasChildren = await this.categoryModel.exists({ parentId: oid });
    if (hasChildren) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang chứa danh mục con',
      );
    }

    const deleted = await this.categoryModel.findByIdAndDelete(oid);
    if (!deleted) throw new NotFoundException('Không tìm thấy danh mục');

    return deleted;
  }

  async findAll() {
    // BƯỚC 1: Lấy cấu trúc cây danh mục từ Database
    // Dùng .lean() để biến Mongoose Document thành Object thường, cho phép ta thêm trường 'productCount'
    const categories = await this.categoryModel
      .find({ parentId: null, isActive: true })
      .populate({
        path: 'children',
        match: { isActive: true },
        populate: { path: 'children', match: { isActive: true } }, // Nest sâu thêm nếu có category cấp 3
      })
      .sort({ name: 1 })
      .lean()
      .exec();

    // BƯỚC 2: Group và đếm số sản phẩm gán TRỰC TIẾP cho mỗi categoryId
    const productCounts = await this.productModel.aggregate([
      {
        $group: {
          _id: '$categoryId', // Gom nhóm theo id danh mục
          count: { $sum: 1 }, // Mỗi sản phẩm đếm là 1
        },
      },
    ]);

    // BƯỚC 3: Chuyển mảng productCounts thành một Map để tra cứu cực nhanh
    // Ví dụ: Map { "id_laptop_gaming" => 5, "id_tai_nghe" => 12 }
    const countMap = new Map();
    productCounts.forEach((pc) => {
      if (pc._id) {
        countMap.set(String(pc._id), pc.count);
      }
    });

    // BƯỚC 4: Hàm đệ quy duyệt cây để gán đếm và cộng dồn từ con lên cha
    const calculateCountAndMap = (category: any) => {
      // 1. Lấy số lượng sản phẩm gán trực tiếp vào danh mục này
      let totalCount = countMap.get(String(category._id)) || 0;

      // 2. Nếu có danh mục con, duyệt qua các con và cộng dồn số lượng của chúng lên cha
      if (category.children && category.children.length > 0) {
        category.children.forEach((child: any) => {
          totalCount += calculateCountAndMap(child); // Gọi lại chính nó (Đệ quy)
        });
      }

      // 3. Gán tổng số tính được vào trường productCount để Frontend lấy
      category.productCount = totalCount;

      // Trả về tổng để danh mục cha cấp cao hơn (nếu có) có thể cộng tiếp
      return totalCount;
    };

    // BƯỚC 5: Chạy hàm đệ quy cho các danh mục gốc (root)
    categories.forEach((cat) => calculateCountAndMap(cat));

    return categories;
  }
}
