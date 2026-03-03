import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: true })
  receiverName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  ward: string;

  @Prop({ required: true })
  district: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: false })
  isDefault: boolean;
}
const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ enum: ['user', 'admin'], default: 'user' })
  role: 'user' | 'admin';

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, select: false, default: null })
  refreshToken: string | null;

  @Prop({ type: String, select: false })
  otpHash?: string;

  @Prop({ type: Date, select: false })
  otpExpires?: Date;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Types.DocumentArray<Address>;
}

export const UserSchema = SchemaFactory.createForClass(User);
