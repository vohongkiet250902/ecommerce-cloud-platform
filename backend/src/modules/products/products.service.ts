import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductVariant } from './schemas/product.schema';
import { Category } from '../categories/schemas/category.schema';
import { Brand } from '../brands/schemas/brand.schema';
import { UploadService } from '../upload/upload.service';
import { SearchService } from '../search/search.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
    private readonly uploadService: UploadService,
    private readonly searchService: SearchService,
  ) {}

  private validateUniqueSku(variants: { sku: string }[]) {
    const skus = variants.map((v) => v.sku);
    if (skus.length !== new Set(skus).size)
      throw new BadRequestException('Duplicate SKU in variants');
  }

  private calculateTotalStock(variants: { stock?: number }[] = []) {
    return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }

  private async validateCategoryAndBrand(
    categoryId?: string,
    brandId?: string,
  ) {
    if (categoryId) {
      const category = await this.categoryModel.findById(categoryId);
      if (!category || !category.isActive)
        throw new BadRequestException(
          'Danh mục không tồn tại hoặc bị vô hiệu hóa',
        );
    }
    if (brandId) {
      const brand = await this.brandModel.findById(brandId);
      if (!brand || !brand.isActive)
        throw new BadRequestException(
          'Thương hiệu không tồn tại hoặc bị vô hiệu hóa',
        );
    }
  }

  // Trong class ProductsService:

  private calculateVariantPrices(variants: any[]) {
    return (variants ?? []).map((v) => {
      const price = Number(v.price ?? 0);
      const rawDiscount = Number(v.discountPercentage ?? 0);
      const importPrice = Number(v.importPrice ?? 0);

      const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
      const discount = Number.isFinite(rawDiscount)
        ? Math.max(0, Math.min(100, rawDiscount))
        : 0;

      const finalPrice =
        safePrice > 0 ? Math.round(safePrice * (1 - discount / 100)) : 0;

      // THÊM: Tính grossMarginPercent on-the-fly để response
      const grossMarginPercent =
        importPrice > 0 && safePrice > 0
          ? Math.round(((safePrice - importPrice) / safePrice) * 10000) / 100
          : null;

      return {
        ...v,
        price: safePrice,
        discountPercentage: discount,
        finalPrice,
        grossMarginPercent,
      };
    });
  }

  // -----------------------------
  // ✅ Search sync helpers (populate để có categoryName/brandName)
  // -----------------------------
  private async getProductForSearchIndex(productId: string) {
    return this.productModel
      .findById(productId)
      .select({
        name: 1,
        slug: 1,
        description: 1,
        categoryId: 1,
        brandId: 1,
        images: 1,
        variants: 1,
        specs: 1,
        totalStock: 1,
        status: 1,
        isFeatured: 1,
        averageRating: 1,
        reviewCount: 1,
        createdAt: 1,
      })
      .populate({ path: 'categoryId', select: 'name' })
      .populate({ path: 'brandId', select: 'name' });
  }

  private async syncProductToSearchById(productId: string) {
    const product = await this.getProductForSearchIndex(productId);
    if (!product) return;
    await this.searchService.addOrUpdateProduct(product);
  }

  /** best-effort để không fail luồng nghiệp vụ nếu Meili lỗi */
  private syncProductToSearchAsync(productId: string) {
    void this.syncProductToSearchById(productId).catch((err) => {
      console.error(
        `[SearchSync] upsert failed for product ${productId}:`,
        err?.message ?? err,
      );
    });
  }

  private removeProductFromSearchAsync(productId: string) {
    void this.searchService.removeProduct(productId).catch((err) => {
      console.error(
        `[SearchSync] delete failed for product ${productId}:`,
        err?.message ?? err,
      );
    });
  }

  // -----------------------------
  // ✅ CRUD
  // -----------------------------
  async create(dto: CreateProductDto) {
    await this.validateCategoryAndBrand(dto.categoryId, dto.brandId);

    // ✅ FIX 2: Khai báo biến riêng để hứng dữ liệu tính toán, không mutate trực tiếp `dto`
    let processedVariants = dto.variants;
    let computedTotalStock = 0;

    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      processedVariants = this.calculateVariantPrices(dto.variants);
      computedTotalStock = this.calculateTotalStock(processedVariants);
    }

    // slug unique
    if (dto.slug) {
      const exists = await this.productModel.findOne({ slug: dto.slug });
      if (exists) throw new BadRequestException('Slug already exists');
    }

    // ✅ FIX 2: Gom DTO và các trường Server tính toán thành 1 Payload để lưu DB
    const payload = {
      ...dto,
      variants: processedVariants,
      totalStock: computedTotalStock,
    };

    const product = await this.productModel.create(payload);

    // incremental indexing
    this.syncProductToSearchAsync(String(product._id));

    return product;
  }

  async findAll(query: any, forAdmin: boolean = false) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      brandId,
      keyword,
      minPrice,
      maxPrice,
      sort,
      isFeatured,
      ...filterParams
    } = query;

    const filter: any = {};

    // 1. Lọc theo trạng thái
    if (!forAdmin) filter.status = 'active';

    // 2. Lọc theo danh mục và thương hiệu
    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;

    // 3. Tìm kiếm theo từ khóa (yêu cầu Text Index trong Schema)
    if (keyword) filter.$text = { $search: keyword };

    // 4. Lọc theo khoảng giá
    if (minPrice || maxPrice) {
      filter['variants.price'] = {};
      if (minPrice) filter['variants.price'].$gte = +minPrice;
      if (maxPrice) filter['variants.price'].$lte = +maxPrice;
    }

    // 5. Lọc theo cờ nổi bật
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    // 6. Lọc theo các thuộc tính động (specs/attributes)
    const attributeQueries: any[] = [];
    Object.keys(filterParams).forEach((key) => {
      if (['sort', 'page', 'limit'].includes(key)) return;
      if (filterParams[key]) {
        attributeQueries.push({
          'variants.attributes': {
            $elemMatch: { key, value: filterParams[key] },
          },
        });
      }
    });
    if (attributeQueries.length > 0) filter.$and = attributeQueries;

    // 7. Xử lý logic sắp xếp (Sort)
    // Quy ước từ Client gửi lên ví dụ: sort=price_asc hoặc sort=createdAt_desc
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 }; // Mặc định mới nhất
    if (sort && typeof sort === 'string') {
      const [sortKey, sortOrder] = sort.split('_');
      if (sortKey && sortOrder) {
        sortOption = { [sortKey]: sortOrder === 'asc' ? 1 : -1 };
      }
    }

    // 8. Phân trang và tính toán an toàn
    const skip = (+page - 1) * +limit;
    const limitNumber = +limit;

    // ✅ FIX: Chạy song song 2 query (Lấy Data và Đếm Tổng Số)
    const [data, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .skip(skip)
        .limit(limitNumber)
        .sort(sortOption)
        .populate('categoryId', 'name slug') // Populate thêm để frontend dễ hiển thị
        .populate('brandId', 'name slug')
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // ✅ FIX: Trả về chuẩn cấu trúc có Metadata
    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limitNumber,
        totalPages: Math.ceil(totalItems / limitNumber),
        currentPage: +page,
      },
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    await this.validateCategoryAndBrand(dto.categoryId, dto.brandId);

    if (dto.slug && dto.slug !== product.slug) {
      const existed = await this.productModel.findOne({
        slug: dto.slug,
        _id: { $ne: id },
      });
      if (existed) throw new BadRequestException('Slug already exists');
    }

    if (dto.images) {
      const newPublicIds = (dto.images || []).map((img) => img.publicId);
      const removedImages = (product.images || []).filter(
        (img: any) => !newPublicIds.includes(img.publicId),
      );
      await Promise.all(
        removedImages.map((img: any) =>
          this.uploadService.deleteImage(img.publicId),
        ),
      );
    }

    // ✅ FIX 3: Tạo updatePayload riêng để tránh lỗi TS khi mutate `dto`
    const updatePayload: any = { ...dto };

    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      const processedVariants = this.calculateVariantPrices(dto.variants);
      updatePayload.variants = processedVariants;
      updatePayload.totalStock = this.calculateTotalStock(processedVariants);
    }

    const updatedProduct = await this.productModel.findByIdAndUpdate(
      id,
      updatePayload, // Truyền payload đã xử lý vào đây
      { new: true, runValidators: true },
    );

    if (!updatedProduct) throw new NotFoundException('Product not found');

    if (
      (updatedProduct as any).status &&
      (updatedProduct as any).status !== 'active'
    ) {
      this.removeProductFromSearchAsync(String(updatedProduct._id));
    } else {
      this.syncProductToSearchAsync(String(updatedProduct._id));
    }

    return updatedProduct;
  }

  async updateStatus(id: string, status: string) {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );
    if (!product) throw new NotFoundException('Product not found');

    // ✅ status inactive => remove khỏi Meili, active => upsert
    if (status !== 'active') {
      this.removeProductFromSearchAsync(String(product._id));
    } else {
      this.syncProductToSearchAsync(String(product._id));
    }

    return product;
  }

  async remove(id: string) {
    const deletedProduct = await this.productModel.findByIdAndDelete(id);

    // ✅ delete khỏi Meili (best-effort)
    if (deletedProduct) {
      this.removeProductFromSearchAsync(String(id));
    }

    return deletedProduct;
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, status: 'active' })
      .populate('categoryId')
      .populate('brandId');
    if (!product) throw new NotFoundException('Product not found or inactive');
    return product;
  }

  async findByIdForAdmin(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('categoryId')
      .populate('brandId');
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * ✅ Admin: đồng bộ toàn bộ index
   * Khuyên dùng pipeline reindex của SearchService (đã batch + purge + thống kê)
   */
  async syncAllToMeilisearch() {
    return this.searchService.reindexProducts({
      purge: true,
      onlyActive: false,
      batchSize: 500,
    });
  }
}
