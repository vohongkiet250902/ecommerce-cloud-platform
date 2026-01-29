import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductVariant } from './schemas/product.schema';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    private readonly uploadService: UploadService,
  ) {}

  /* ================== PRIVATE HELPERS ================== */

  private validateUniqueSku(variants: ProductVariant[]) {
    const skus = variants.map((v) => v.sku);
    const unique = new Set(skus);

    if (skus.length !== unique.size) {
      throw new BadRequestException('Duplicate SKU in product variants');
    }
  }

  private calculateTotalStock(variants: ProductVariant[] = []) {
    return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  /* ================== CRUD ================== */

  async create(dto: any) {
    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      dto.totalStock = this.calculateTotalStock(dto.variants);
    }

    const exists = await this.productModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');
    return this.productModel.create(dto);
  }

  async findAll(query: any) {
    // 1. Tách các tham số đặc biệt (System params)
    const {
      page = 1,
      limit = 10,
      categoryId,
      brandId,
      keyword,
      minPrice,
      maxPrice,
      sort, // Thêm sort nếu cần
      ...filterParams // Tất cả những cái còn lại sẽ được coi là Attributes (RAM, CPU, Color...)
    } = query;

    const filter: any = {};

    // 2. Các bộ lọc cơ bản (Giữ nguyên)
    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;

    if (keyword) {
      filter.$text = { $search: keyword };
    }

    if (minPrice || maxPrice) {
      filter['variants.price'] = {};
      if (minPrice) filter['variants.price'].$gte = +minPrice;
      if (maxPrice) filter['variants.price'].$lte = +maxPrice;
    }

    // === 3. LOGIC MỚI: Xử lý Dynamic Attributes ===
    // Mục tiêu: Biến ?RAM=16GB thành query tìm trong variants.attributes

    const attributeQueries: any[] = [];

    Object.keys(filterParams).forEach((key) => {
      // Bỏ qua nếu lỡ còn sót các key hệ thống
      if (['sort', 'page', 'limit'].includes(key)) return;

      const value = filterParams[key];

      if (value) {
        attributeQueries.push({
          'variants.attributes': {
            $elemMatch: {
              key: key,
              value: value,
            },
          },
        });
      }
    });

    // Nếu có attribute queries, dùng $and
    if (attributeQueries.length > 0) {
      filter.$and = attributeQueries;
    }

    // 4. Thực thi
    return this.productModel
      .find(filter)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 }); // Hoặc xử lý biến sort động
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: any) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    // ===== 1. HANDLE IMAGE DELETE =====
    if (dto.images) {
      const oldImages = product.images || [];
      const newImages = dto.images || [];

      const newPublicIds = newImages.map((img) => img.publicId);

      const removedImages = oldImages.filter(
        (img) => !newPublicIds.includes(img.publicId),
      );

      // delete removed images from Cloudinary
      await Promise.all(
        removedImages.map((img) =>
          this.uploadService.deleteImage(img.publicId),
        ),
      );
    }

    // ===== 2. HANDLE VARIANTS (nếu có) =====
    if (dto.variants?.length) {
      this.validateUniqueSku(dto.variants);
      dto.totalStock = this.calculateTotalStock(dto.variants);
    }

    return this.productModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    return product.deleteOne();
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, status: 'active' })
      .populate('categoryId')
      .populate('brandId');

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async removeImage(productId: string, publicId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const imageExists = product.images.some((img) => img.publicId === publicId);

    if (!imageExists) {
      throw new BadRequestException('Image not found in product');
    }

    // 1. Delete image from Cloudinary
    await this.uploadService.deleteImage(publicId);

    // 2. Remove image from DB
    product.images = product.images.filter((img) => img.publicId !== publicId);

    await product.save();

    return product;
  }
}
