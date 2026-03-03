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

// Sub-schema cho thông tin sản phẩm (giữ nguyên)
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  imageUrl?: string;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// BỔ SUNG 1: Sub-schema cho Thông tin giao hàng (Snapshot)
@Schema({ _id: false })
export class ShippingInfo {
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
}
const ShippingInfoSchema = SchemaFactory.createForClass(ShippingInfo);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  // BỔ SUNG 2: Lưu cứng cục thông tin giao hàng vào Order
  @Prop({ type: ShippingInfoSchema, required: true })
  shippingInfo: ShippingInfo;

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
    enum: ['cod', 'mock', 'vnpay'],
    default: 'mock',
  })
  paymentMethod: PaymentMethod;

  @Prop({ trim: true })
  idempotencyKey?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
