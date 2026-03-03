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

  private calculateVariantPrices(variants: ProductVariant[] = []) {
    variants.forEach((v: any) => {
      const discount = v.discountPercentage || 0;
      v.finalPrice = v.price - v.price * (discount / 100);
    });
  }

  async create(dto: any) {
    await this.validateCategoryAndBrand(dto.categoryId, dto.brandId);
    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      dto.totalStock = this.calculateTotalStock(dto.variants);
      this.calculateVariantPrices(dto.variants);
    }
    const exists = await this.productModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');

    // Lưu vào MongoDB
    const product = await this.productModel.create(dto);

    // BỔ SUNG: Đồng bộ sang Meilisearch
    this.searchService
      .addOrUpdateProduct(product)
      .catch((err) => console.error('Lỗi đồng bộ tạo mới Meilisearch:', err));

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

    if (!forAdmin) filter.status = 'active';
    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;
    if (keyword) filter.$text = { $search: keyword };
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

    if (dto.images) {
      const newPublicIds = (dto.images || []).map((img) => img.publicId);
      const removedImages = (product.images || []).filter(
        (img) => !newPublicIds.includes(img.publicId),
      );
      await Promise.all(
        removedImages.map((img) =>
          this.uploadService.deleteImage(img.publicId),
        ),
      );
    }

    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      dto.totalStock = this.calculateTotalStock(dto.variants);
      this.calculateVariantPrices(dto.variants);
    }

    const updatedProduct = await this.productModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    // BỔ SUNG: Đồng bộ cập nhật sang Meilisearch
    if (updatedProduct) {
      this.searchService
        .addOrUpdateProduct(updatedProduct)
        .catch((err) =>
          console.error('Lỗi đồng bộ cập nhật Meilisearch:', err),
        );
    }

    return updatedProduct;
  }

  async updateStatus(id: string, status: string) {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!product) throw new NotFoundException('Product not found');

    // BỔ SUNG: Đồng bộ trạng thái sang Meilisearch
    this.searchService
      .addOrUpdateProduct(product)
      .catch((err) =>
        console.error('Lỗi đồng bộ trạng thái Meilisearch:', err),
      );

    return product;
  }

  async remove(id: string) {
    const deletedProduct = await this.productModel.findByIdAndDelete(id);

    // BỔ SUNG: Xóa khỏi Meilisearch
    if (deletedProduct) {
      this.searchService
        .removeProduct(id)
        .catch((err) => console.error('Lỗi đồng bộ xóa Meilisearch:', err));
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

  // BỔ SUNG: Hàm đồng bộ toàn bộ sản phẩm sang Meilisearch dành cho Admin
  async syncAllToMeilisearch() {
    // Lấy toàn bộ sản phẩm trong DB
    const products = await this.productModel.find({});
    let successCount = 0;

    for (const product of products) {
      try {
        await this.searchService.addOrUpdateProduct(product);
        successCount++;
      } catch (error) {
        console.error(`Lỗi đồng bộ sản phẩm ${product._id}:`, error);
      }
    }

    return {
      message: 'Đồng bộ hoàn tất!',
      totalProductsInDB: products.length,
      syncedToMeilisearch: successCount,
    };
  }
}
