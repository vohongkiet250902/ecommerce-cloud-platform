import { IsIn } from 'class-validator';

export const ORDER_STATUSES = ['pending', 'paid', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Generic status DTO (không dùng cho admin).
 * Nếu bạn có endpoint nội bộ thì dùng cái này.
 */
export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;
}

/**
 * Admin chỉ được cancel. Paid phải đi qua Payment flow.
 */
export const ADMIN_ALLOWED_STATUSES = ['cancelled'] as const;
export type AdminAllowedStatus = (typeof ADMIN_ALLOWED_STATUSES)[number];

export class AdminUpdateOrderStatusDto {
  @IsIn(ADMIN_ALLOWED_STATUSES)
  status: AdminAllowedStatus;
}
