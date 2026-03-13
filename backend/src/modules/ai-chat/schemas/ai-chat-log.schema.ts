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
  queryId?: string;

  @Prop({ type: String, required: false })
  retrievalMode?: string;

  @Prop({ type: String, required: false })
  normalizedQuery?: string;

  @Prop({ type: String, required: false })
  cleanQuery?: string;

  @Prop({ type: String, required: false })
  resolvedMessage?: string;

  @Prop({ type: String, required: false })
  inferredIntentGroup?: string;

  @Prop({ type: [String], default: [] })
  inferredCategoryIds: string[];

  @Prop({ type: [String], default: [] })
  inferredBrandIds: string[];

  @Prop({ type: [String], default: [] })
  suggestedQueries: string[];

  @Prop({ type: [String], default: [] })
  retrievedProductIds: string[];

  @Prop({ type: [String], default: [] })
  retrievedKnowledgeIds: string[];

  @Prop({ type: Number, default: 0 })
  totalHits: number;

  @Prop({ type: Boolean, default: false })
  fallbackUsed: boolean;

  @Prop({ type: Boolean, default: false })
  llmUsed: boolean;

  @Prop({ type: String, required: false })
  llmModel?: string;

  @Prop({ type: String, required: false })
  llmErrorReason?: string;

  @Prop({ type: String, default: '' })
  answer: string;

  @Prop({ type: Object, required: false })
  stateSnapshot?: Record<string, any>;

  @Prop({ type: Date, required: true })
  timestamp: Date;
}

export const AiChatLogSchema = SchemaFactory.createForClass(AiChatLog);

AiChatLogSchema.index({ timestamp: -1 });
AiChatLogSchema.index({ intent: 1, timestamp: -1 });
AiChatLogSchema.index({ sessionId: 1, timestamp: -1 });
AiChatLogSchema.index({ queryId: 1 });
AiChatLogSchema.index({ sessionId: 1, intent: 1, timestamp: -1 });
