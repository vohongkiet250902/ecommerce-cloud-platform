import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class ProductAttribute {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: string;
}
const ProductAttributeSchema = SchemaFactory.createForClass(ProductAttribute);

@Schema({ _id: false })
export class ProductVariant {
  @Prop({ required: true })
  sku: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, default: 0 })
  stock: number;

  @Prop({ type: [ProductAttributeSchema], default: [] })
  attributes: ProductAttribute[];

  @Prop({
    type: { url: String, publicId: String },
    default: null,
  })
  image?: { url: string; publicId: string };

  @Prop({ default: 'active' })
  status: string;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  discountPercentage: number;

  @Prop({ type: Number })
  finalPrice: number;
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

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ type: [ProductAttributeSchema], default: [] })
  specs: ProductAttribute[];

  @Prop({ default: 0 })
  totalStock: number;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  reviewCount: number;
}

const schema = SchemaFactory.createForClass(Product);
schema.index({ 'variants.attributes.key': 1, 'variants.attributes.value': 1 });

export const ProductSchema = schema;
