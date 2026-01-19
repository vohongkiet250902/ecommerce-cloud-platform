import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class ProductVariant {
  @Prop({ required: true })
  sku: string;

  @Prop({ type: Map, of: String })
  attributes: {
    color?: string;
    ram?: string;
    storage?: string;
    version?: string;
  };

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  stock: number;
}

const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ type: Map, of: String })
  specifications?: Record<string, string>;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  warranty?: string;

  @Prop()
  brandCountry?: string;

  @Prop({ default: 'active', enum: ['active', 'hidden'] })
  status: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
