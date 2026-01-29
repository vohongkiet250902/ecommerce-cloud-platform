import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// 1. Định nghĩa Schema cho một thuộc tính đơn lẻ (Key-Value)
@Schema({ _id: false }) // Không cần _id cho sub-document này
export class ProductAttribute {
  @Prop({ required: true })
  key: string; // VD: "RAM", "Màu sắc", "CPU"

  @Prop({ required: true })
  value: string; // VD: "8GB", "Đỏ", "Core i5"
}
const ProductAttributeSchema = SchemaFactory.createForClass(ProductAttribute);

// 2. Định nghĩa Schema cho Variant (Biến thể)
@Schema({ _id: false }) // Có thể để true nếu muốn quản lý variant theo ID riêng
export class ProductVariant {
  @Prop({ required: true })
  sku: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, default: 0 })
  stock: number;

  // Thay vì khai báo cứng color, ram... ta dùng mảng attributes
  @Prop({ type: [ProductAttributeSchema], default: [] })
  attributes: ProductAttribute[];

  // Có thể thêm ảnh riêng cho variant này (VD: màu đỏ có ảnh đỏ)
  @Prop({
    type: { url: String, publicId: String },
    default: null,
  })
  image?: { url: string; publicId: string };

  @Prop({ default: 'active' })
  status: string;
}
const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({
    type: [{ url: String, publicId: String }],
    default: [],
  })
  images: { url: string; publicId: string }[];

  // === CẬP NHẬT: Sử dụng Schema Variant mới ===
  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  // Giúp lọc nhanh sản phẩm (VD: Màn hình 15 inch) mà không cần chọc vào variants
  @Prop({ type: [ProductAttributeSchema], default: [] })
  specs: ProductAttribute[];

  @Prop({ default: 0 })
  totalStock: number;

  @Prop({ default: 'active' })
  status: string;
}

// Tạo Index để tìm kiếm nhanh theo thuộc tính (VD: Tìm tất cả SP có RAM 8GB)
// Cú pháp index này giúp MongoDB tìm trong mảng object
const schema = SchemaFactory.createForClass(Product);
schema.index({ 'variants.attributes.key': 1, 'variants.attributes.value': 1 });

export const ProductSchema = schema;
