import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Coupon extends Document {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, min: 1, max: 100 })
  discountPercentage: number;

  @Prop()
  maxDiscountAmount: number;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  minOrderValue?: number;

  @Prop()
  usageLimit?: number;

  @Prop({ default: 0 })
  usedCount: number;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
