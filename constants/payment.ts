/**
 * Phương thức & trạng thái thanh toán - mirror BE
 * `src/features/order/types/payment-method.enum.ts` và `payment-status.enum.ts`.
 */
import type { StatusTone } from './order-status';

export const PAYMENT_METHOD = {
  /** Thanh toán qua PayOS. Đơn khởi tạo ở trạng thái PENDING_PAYMENT. */
  ONLINE: 'online',
  /** Thu ngân thu tại quầy. Đơn khởi tạo CONFIRMED + UNPAID. */
  CASH: 'cash',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  online: 'Thanh toán online',
  cash: 'Tiền mặt tại quầy',
};

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
  /**
   * Ưu đãi đã phủ hết giá trị đơn nên không còn gì để thu. Đơn đã tất toán
   * nhưng BE cố ý KHÔNG tính vào doanh thu.
   */
  NO_PAYMENT_REQUIRED: 'no_payment_required',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: StatusTone }
> = {
  unpaid: { label: 'Chưa thanh toán', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  refunded: { label: 'Đã hoàn tiền', tone: 'muted' },
  no_payment_required: { label: 'Không cần thanh toán', tone: 'success' },
};

/** Đơn đã tất toán: khách không còn phải trả gì nữa. */
export function isSettledPayment(status: PaymentStatus): boolean {
  return (
    status === PAYMENT_STATUS.PAID ||
    status === PAYMENT_STATUS.NO_PAYMENT_REQUIRED
  );
}
