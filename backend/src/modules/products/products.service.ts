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

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
    private readonly uploadService: UploadService,
    private readonly searchService: SearchService,
  ) {}

  private validateUniqueSku(variants: ProductVariant[]) {
    const skus = variants.map((v) => v.sku);
    if (skus.length !== new Set(skus).size)
      throw new BadRequestException('Duplicate SKU in variants');
  }

  private calculateTotalStock(variants: ProductVariant[] = []) {
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

  private calculateVariantPrices(variants: any[]) {
    return (variants ?? []).map((v) => {
      const price = Number(v.price ?? 0);
      const rawDiscount = Number(v.discountPercentage ?? 0);

      const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
      const discount = Number.isFinite(rawDiscount)
        ? Math.max(0, Math.min(100, rawDiscount))
        : 0;

      const finalPrice =
        safePrice > 0 ? Math.round(safePrice * (1 - discount / 100)) : 0;

      return {
        ...v,
        price: safePrice,
        discountPercentage: discount,
        finalPrice,
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
  async create(dto: any) {
    await this.validateCategoryAndBrand(dto.categoryId, dto.brandId);

    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      dto.variants = this.calculateVariantPrices(dto.variants); // ✅ FIX: phải gán lại
      dto.totalStock = this.calculateTotalStock(dto.variants);
    }

    // slug unique
    if (dto.slug) {
      const exists = await this.productModel.findOne({ slug: dto.slug });
      if (exists) throw new BadRequestException('Slug already exists');
    }

    const product = await this.productModel.create(dto);

    // ✅ incremental indexing đúng chuẩn (populate category/brand name)
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
      sort, // hiện chưa dùng => bạn có thể implement sau
      isFeatured,
      ...filterParams
    } = query;

    const filter: any = {};
    if (!forAdmin) filter.status = 'active';
    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;
    if (keyword) filter.$text = { $search: keyword };

    // Lưu ý: filter này theo variants.price (DB), khác với search engine (min/max overlap)
    if (minPrice || maxPrice) {
      filter['variants.price'] = {};
      if (minPrice) filter['variants.price'].$gte = +minPrice;
      if (maxPrice) filter['variants.price'].$lte = +maxPrice;
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

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

    return this.productModel
      .find(filter)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 });
  }

  async update(id: string, dto: any) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    await this.validateCategoryAndBrand(dto.categoryId, dto.brandId);

    // ✅ slug unique when updating
    if (dto.slug && dto.slug !== product.slug) {
      const existed = await this.productModel.findOne({
        slug: dto.slug,
        _id: { $ne: id },
      });
      if (existed) throw new BadRequestException('Slug already exists');
    }

    // remove old images if replaced
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

    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      dto.variants = this.calculateVariantPrices(dto.variants); // ✅ FIX: phải gán lại
      dto.totalStock = this.calculateTotalStock(dto.variants);
    }

    const updatedProduct = await this.productModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!updatedProduct) throw new NotFoundException('Product not found');

    // ✅ incremental indexing đúng chuẩn
    // nếu status không active thì remove khỏi index (tránh “rác” trong search)
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
