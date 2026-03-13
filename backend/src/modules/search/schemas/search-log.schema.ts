import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SearchLogDocument = SearchLog & Document;

@Schema({ timestamps: false })
export class SearchLog {
  @Prop({ type: String, required: true })
  queryId: string;

  @Prop({ type: String, default: '' })
  q: string;

  @Prop({ type: String, required: false })
  appliedQuery?: string;

  @Prop({ type: Object, default: {} })
  filters: Record<string, any>;

  @Prop({ type: String, required: false })
  sort?: string;

  @Prop({ type: Number, default: 0 })
  totalHits: number;

  @Prop({ type: Number, default: 0 })
  coarseTotalHits: number;

  @Prop({ type: Boolean, default: false })
  strictVariantFiltering: boolean;

  @Prop({ type: Number, default: 0 })
  latencyMs: number;

  @Prop({ type: Number, required: false })
  processingTimeMs?: number;

  @Prop({ type: String, required: false })
  retrievalStrategy?: string;

  @Prop({ type: String, required: false })
  queryType?: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: false })
  sessionId?: string;

  @Prop({ type: Date, required: true })
  timestamp: Date;
}

export const SearchLogSchema = SchemaFactory.createForClass(SearchLog);
SearchLogSchema.index({ timestamp: -1 });
SearchLogSchema.index({ q: 1, timestamp: -1 });
SearchLogSchema.index({ totalHits: 1, timestamp: -1 });
SearchLogSchema.index({ retrievalStrategy: 1, timestamp: -1 });
SearchLogSchema.index({ queryType: 1, timestamp: -1 });
