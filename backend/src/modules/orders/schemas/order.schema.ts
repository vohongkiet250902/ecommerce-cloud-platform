import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export type PaymentMethod = 'cod' | 'mock' | 'vnpay';

@Schema() // embedded subdocument: không cần timestamps
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

  @Prop({
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status: OrderStatus;

  @Prop({
    enum: ['cod', 'mock', 'vnpay'],
    default: 'mock',
  })
  paymentMethod: PaymentMethod;

  /**
   * Idempotency key: unique per user (sparse)
   */
  @Prop({ trim: true })
  idempotencyKey?: string;

  // optional audit for payment
  @Prop()
  paidAt?: Date;

  @Prop()
  paymentProvider?: string;

  @Prop()
  paymentRef?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// indexes
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

// idempotency: unique per user, only when provided
OrderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true },
);
