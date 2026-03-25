import { IsIn } from 'class-validator';

export const ADMIN_ORDER_STATUSES = [
  'confirmed',
  'shipping',
  'delivered',
  'completed',
  'delivery_failed',
  'returned',
  'cancelled',
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export class AdminUpdateOrderStatusDto {
  @IsIn(ADMIN_ORDER_STATUSES)
  status: AdminOrderStatus;
}
