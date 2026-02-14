import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // snapshot

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  price: number; // snapshot

  @Prop({ required: true })
  quantity: number;

  @Prop()
  imageUrl?: string; // snapshot
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({
    enum: ['pending', 'paid', 'shipping', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop({
    enum: ['cod', 'mock'],
    default: 'mock',
  })
  paymentMethod: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
