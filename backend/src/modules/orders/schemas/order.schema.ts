import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipping'
  | 'completed'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type PaymentMethod = 'cod' | 'mock' | 'vnpay';

@Schema({ _id: false })
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

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop()
  couponCode?: string;

  @Prop({ default: 0 })
  discountAmount?: number;

  @Prop({
    enum: ['pending', 'paid', 'shipping', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status: OrderStatus;

  @Prop({
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  })
  paymentStatus: PaymentStatus;

  @Prop({
    enum: ['cod', 'mock', 'vnpay'], // ✅ Đã giữ lại vnpay
    default: 'mock',
  })
  paymentMethod: PaymentMethod;

  // ✅ Khôi phục Idempotency Key chống user spam click tạo 2 đơn liên tục
  @Prop({ trim: true })
  idempotencyKey?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
