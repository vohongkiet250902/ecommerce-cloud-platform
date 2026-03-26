import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryLotSource =
  | 'opening_balance'
  | 'purchase'
  | 'return'
  | 'manual';

@Schema({ timestamps: true })
export class InventoryLot extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true, index: true, trim: true })
  sku: string;

  @Prop({ type: Number, required: true, min: 0 })
  unitCost: number;

  @Prop({ type: Number, required: true, min: 1 })
  originalQuantity: number;

  @Prop({ type: Number, required: true, min: 0, index: true })
  remainingQuantity: number;

  @Prop({ type: Number, min: 0 })
  sellingPrice?: number;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  receivedAt: Date;

  @Prop({
    type: String,
    enum: ['opening_balance', 'purchase', 'return', 'manual'],
    default: 'purchase',
  })
  sourceType: InventoryLotSource;

  @Prop({ trim: true })
  sourceRef?: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ type: Boolean, default: false })
  isClosed: boolean;
}

const schema = SchemaFactory.createForClass(InventoryLot);

schema.index({ productId: 1, sku: 1, receivedAt: 1, createdAt: 1 });

export const InventoryLotSchema = schema;
