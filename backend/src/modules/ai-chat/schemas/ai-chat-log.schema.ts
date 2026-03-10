import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiChatLogDocument = AiChatLog & Document;

@Schema({ timestamps: false })
export class AiChatLog {
  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true })
  intent: string;

  @Prop({ type: String, required: false })
  sessionId?: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: false })
  retrievalMode?: string;

  @Prop({ type: [String], default: [] })
  retrievedProductIds: string[];

  @Prop({ type: [String], default: [] })
  retrievedKnowledgeIds: string[];

  @Prop({ type: Number, default: 0 })
  totalHits: number;

  @Prop({ type: Boolean, default: false })
  fallbackUsed: boolean;

  @Prop({ type: String, default: '' })
  answer: string;

  @Prop({ type: Date, required: true })
  timestamp: Date;
}

export const AiChatLogSchema = SchemaFactory.createForClass(AiChatLog);
AiChatLogSchema.index({ timestamp: -1 });
AiChatLogSchema.index({ intent: 1, timestamp: -1 });
AiChatLogSchema.index({ sessionId: 1, timestamp: -1 });
