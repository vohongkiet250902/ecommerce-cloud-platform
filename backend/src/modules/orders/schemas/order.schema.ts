import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed';

export type PaymentMethod = 'cod' | 'mock' | 'vnpay';

@Schema({ _id: false })
export class LotAllocation {
  @Prop({ type: Types.ObjectId, ref: 'InventoryLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitCost: number;
}
const LotAllocationSchema = SchemaFactory.createForClass(LotAllocation);

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;

  @Prop({ min: 0, default: 0 })
  unitCostSnapshot?: number;

  @Prop({ type: [LotAllocationSchema], default: [] })
  lotAllocations: LotAllocation[];

  @Prop()
  imageUrl?: string;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

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
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: ShippingInfoSchema, required: true })
  shippingInfo: ShippingInfo;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop()
  couponCode?: string;

  @Prop({ default: 0 })
  discountAmount?: number;

  @Prop({
    enum: [
      'pending',
      'confirmed',
      'shipping',
      'delivered',
      'completed',
      'cancelled',
    ],
    default: 'pending',
    index: true,
  })
  status: OrderStatus;

  @Prop({
    enum: ['unpaid', 'pending', 'paid', 'refunded', 'failed'],
    default: 'unpaid',
    index: true,
  })
  paymentStatus: PaymentStatus;

  @Prop({
    enum: ['cod', 'mock', 'vnpay'],
    default: 'mock',
  })
  paymentMethod: PaymentMethod;

  @Prop({ trim: true, index: true })
  idempotencyKey?: string;

  @Prop()
  placedAt?: Date;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  expiresAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
    },
  },
);
