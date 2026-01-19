import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  logo?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
