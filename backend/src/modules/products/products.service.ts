import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    private readonly uploadService: UploadService,
  ) {}

  /* ================== PRIVATE HELPERS ================== */

  private validateUniqueSku(variants: any[]) {
    const skus = variants.map((v) => v.sku);
    const unique = new Set(skus);

    if (skus.length !== unique.size) {
      throw new BadRequestException('Duplicate SKU in product variants');
    }
  }

  private calculateTotalStock(variants: any[] = []) {
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
    const { page = 1, limit = 10, categoryId, brandId, keyword } = query;

    const filter: any = {};
    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;

    if (keyword) {
      filter.$text = { $search: keyword };
    }

    return this.productModel
      .find(filter)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 });
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

    // ===== 3. UPDATE DB =====
    const updatedProduct = await this.productModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    return updatedProduct;
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
