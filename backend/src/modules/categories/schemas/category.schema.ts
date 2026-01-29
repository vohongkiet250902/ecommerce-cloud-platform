import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Category extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parentId: Types.ObjectId | null;

  // Định nghĩa những thuộc tính nào sẽ hiển thị trên bộ lọc tìm kiếm
  // Ví dụ với Laptop: ['RAM', 'CPU', 'Ổ cứng', 'Màn hình']
  // Ví dụ với Áo: ['Size', 'Màu sắc', 'Chất liệu']
  @Prop({ type: [String], default: [] })
  filterableAttributes: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});
