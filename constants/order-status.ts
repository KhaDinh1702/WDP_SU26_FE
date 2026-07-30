/**
 * Trạng thái đơn rửa xe - mirror BE `src/features/order/types/order-status.enum.ts`.
 * KHÔNG đổi giá trị string hoặc bảng transition nếu BE chưa đổi.
 */
export const ORDER_STATUS = {
  /** Đã gửi link thanh toán online, chờ webhook PayOS. */
  PENDING_PAYMENT: 'pending_payment',
  /** Đã thanh toán (online) hoặc đã đặt (tiền mặt). Đã giữ slot ca. */
  CONFIRMED: 'confirmed',
  /** Khách đã đến cửa hàng. */
  CHECKED_IN: 'checked_in',
  /** Đang rửa xe. */
  IN_PROGRESS: 'in_progress',
  /** Đã rửa xong. Trạng thái kết thúc. */
  COMPLETED: 'completed',
  /** Đã hủy bởi khách/nhân viên hoặc tự hết hạn. Trạng thái kết thúc. */
  CANCELLED: 'cancelled',
  /** Khách không đến. Trạng thái kết thúc. */
  NO_SHOW: 'no_show',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Tông màu badge - ánh xạ sang token màu trong globals.css. */
export type StatusTone =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'muted';

/** Nhãn tiếng Việt + tông màu badge cho từng trạng thái. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: StatusTone }
> = {
  pending_payment: { label: 'Chờ thanh toán', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'info' },
  checked_in: { label: 'Đã đến cửa hàng', tone: 'primary' },
  in_progress: { label: 'Đang rửa', tone: 'primary' },
  completed: { label: 'Hoàn thành', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'destructive' },
  no_show: { label: 'Không đến', tone: 'muted' },
};

/**
 * Các chuyển trạng thái hợp lệ - mirror BE `order.state-machine.ts`.
 * Dùng cho `BookingActionPanel` để chỉ hiển thị hành động hợp lệ.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Trạng thái đang giữ slot ca (chưa kết thúc). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.CHECKED_IN,
  ORDER_STATUS.IN_PROGRESS,
];

/** Trạng thái kết thúc (terminal). */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.NO_SHOW,
];

export function isActiveOrderStatus(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status);
}

/**
 * Số đơn đang giữ slot mà một khách được có cùng lúc - mirror BE (vượt hạn mức
 * thì `POST /me/orders` trả 400 "You already have 3 active orders (limit 3)").
 * BE hard-code hạn mức này, chưa expose qua API nào → BE nới thì sửa cả ở đây.
 *
 * Hằng số này chỉ để CHẶN TRƯỚC cho khách khỏi đi hết luồng đặt lịch rồi mới bị
 * từ chối; BE vẫn là nơi quyết định cuối cùng.
 */
export const MAX_ACTIVE_ORDERS = 3;

/** Khách hàng chỉ được tự hủy trước khi bắt đầu rửa. */
export function isCancellableByCustomer(status: OrderStatus): boolean {
  return (
    status === ORDER_STATUS.PENDING_PAYMENT ||
    status === ORDER_STATUS.CONFIRMED
  );
}

/**
 * Số lần khách được tự đổi lịch một đơn - mirror BE (vượt hạn mức thì BE trả
 * 400 "Reschedule limit reached (2)"). BE đang hard-code hạn mức này, chưa
 * expose qua API nào, nên nếu BE nới hạn mức thì phải sửa cả ở đây.
 *
 * Hằng số này chỉ để CHẶN TRƯỚC cho khỏi gửi request thừa; BE vẫn là nơi
 * quyết định cuối cùng và `RescheduleOrderModal` vẫn xử lý lỗi 400 đó.
 */
export const MAX_CUSTOMER_RESCHEDULE = 2;

/** Khách còn được đổi lịch đơn này không: đúng trạng thái VÀ còn lượt đổi. */
export function isReschedulableByCustomer(order: {
  status: OrderStatus;
  rescheduleCount?: number;
}): boolean {
  return (
    isCancellableByCustomer(order.status) &&
    (order.rescheduleCount ?? 0) < MAX_CUSTOMER_RESCHEDULE
  );
}

export function isValidOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
