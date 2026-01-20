import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
    type: [
      {
        url: String,
        publicId: String,
      },
    ],
    default: [],
  })
  images: {
    url: string;
    publicId: string;
  }[];

  @Prop({
    type: [
      {
        sku: { type: String, required: true },
        color: String,
        storage: String,
        ram: String,
        price: { type: Number, required: true },
        stock: { type: Number, default: 0 },
        status: { type: String, default: 'active' },
      },
    ],
    default: [],
  })
  variants: any[];

  @Prop({ default: 0 })
  totalStock: number;

  @Prop({ default: 'active' })
  status: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
