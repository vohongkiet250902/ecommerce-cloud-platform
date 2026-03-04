import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClickLogDocument = ClickLog & Document;

@Schema({ timestamps: false })
export class ClickLog {
  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: false })
  queryId?: string;

  @Prop({ type: String, required: false })
  q?: string;

  @Prop({ type: Number, required: false })
  position?: number;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: false })
  sessionId?: string;

  @Prop({ type: Date, required: true })
  timestamp: Date;
}

export const ClickLogSchema = SchemaFactory.createForClass(ClickLog);
ClickLogSchema.index({ timestamp: -1 });
ClickLogSchema.index({ queryId: 1, timestamp: -1 });
ClickLogSchema.index({ productId: 1, timestamp: -1 });
