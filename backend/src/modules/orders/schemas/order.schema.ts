import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'delivery_failed'
  | 'returned'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed';

export type PaymentMethod = 'cod' | 'mock' | 'vnpay';

export type ShippingSyncStatus =
  | 'not_created'
  | 'created'
  | 'create_failed'
  | 'synced';

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

  @Prop({ type: MongooseSchema.Types.Mixed })
  attributes?: any;
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

  @Prop()
  ghnDistrictId?: number;

  @Prop()
  ghnWardCode?: string;
}
const ShippingInfoSchema = SchemaFactory.createForClass(ShippingInfo);

@Schema({ _id: false })
export class ParcelSnapshot {
  @Prop({ required: true, min: 1 })
  weight: number;

  @Prop({ required: true, min: 1 })
  length: number;

  @Prop({ required: true, min: 1 })
  width: number;

  @Prop({ required: true, min: 1 })
  height: number;
}
const ParcelSnapshotSchema = SchemaFactory.createForClass(ParcelSnapshot);

@Schema({ _id: false })
export class ShippingStatusHistory {
  @Prop({ required: true })
  status: string;

  @Prop()
  note?: string;

  @Prop({ required: true, default: Date.now })
  at: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  raw?: any;
}
const ShippingStatusHistorySchema = SchemaFactory.createForClass(
  ShippingStatusHistory,
);

@Schema({ _id: false })
export class ShippingIntegration {
  @Prop({ default: 'ghn' })
  provider?: string;

  @Prop({ enum: ['test', 'production'], default: 'test' })
  env?: 'test' | 'production';

  @Prop({
    enum: ['not_created', 'created', 'create_failed', 'synced'],
    default: 'not_created',
  })
  syncStatus?: ShippingSyncStatus;

  @Prop()
  providerOrderCode?: string;

  @Prop()
  clientOrderCode?: string;

  @Prop()
  serviceId?: number;

  @Prop()
  serviceTypeId?: number;

  @Prop()
  fee?: number;

  @Prop()
  codAmount?: number;

  @Prop()
  status?: string;

  @Prop()
  expectedDeliveryTime?: Date;

  @Prop({ type: ParcelSnapshotSchema })
  parcelSnapshot?: ParcelSnapshot;

  @Prop({ type: [ShippingStatusHistorySchema], default: [] })
  statusHistory?: ShippingStatusHistory[];

  @Prop()
  createError?: string;

  @Prop()
  lastWebhookType?: string;

  @Prop()
  lastSyncedAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rawCreateResponse?: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rawLastPayload?: any;
}
const ShippingIntegrationSchema =
  SchemaFactory.createForClass(ShippingIntegration);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: ShippingInfoSchema, required: true })
  shippingInfo: ShippingInfo;

  @Prop({ type: ShippingIntegrationSchema })
  shipping?: ShippingIntegration;

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
      'delivery_failed',
      'returned',
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
    default: 'cod',
  })
  paymentMethod: PaymentMethod;

  @Prop({ trim: true })
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
  deliveryFailedAt?: Date;

  @Prop()
  returnedAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop()
  vnpayTransactionDate?: string;
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

OrderSchema.index(
  { 'shipping.providerOrderCode': 1 },
  {
    unique: true,
    sparse: true,
  },
);

OrderSchema.index(
  { 'shipping.clientOrderCode': 1 },
  {
    unique: true,
    sparse: true,
  },
);
