import {
  isActiveOrderStatus,
  MAX_ACTIVE_ORDERS,
  MAX_CUSTOMER_RESCHEDULE,
} from '@/constants/order-status';
import { getRawServerMessage } from '@/lib/getErrorMessage';
import type { Order } from '@/types/order';

/**
 * Luật nghiệp vụ của đơn rửa xe mà BE áp lúc tạo/đổi lịch, mirror lại ở FE để
 * chặn trước (disable khung giờ trùng, chặn khi hết hạn mức đơn) thay vì để
 * khách đi hết luồng rồi mới nhận 400/409. BE vẫn là nơi quyết định cuối cùng.
 */

/** Lưới khung giờ `available-slots` của BE cách nhau 30 phút. */
export const SLOT_STEP_MINUTES = 30;

const MINUTE_MS = 60_000;

function orderId(order: Order): string {
  return order.id || order._id || '';
}

/** Đơn chưa kết thúc — vẫn giữ slot ca nên vẫn tính vào hạn mức và chặn trùng giờ. */
export function getActiveOrders(orders: Order[]): Order[] {
  return orders.filter((o) => isActiveOrderStatus(o.status));
}

/** Khoảng thời gian một chiếc xe đã bị chiếm bởi một đơn đang hoạt động. */
export interface VehicleBusyRange {
  order: Order;
  startMs: number;
  endMs: number;
}

/**
 * Các khoảng giờ mà CHIẾC XE đang chọn đã có lịch rửa. BE từ chối đặt/đổi lịch
 * chồng lấn cho cùng một xe (409 "Xe này đã có lịch rửa lúc … trùng với khung
 * giờ bạn chọn"), nên FE dựng lại đúng các khoảng đó để disable trước.
 *
 * `minutesOf` để màn hình tự quyết thời lượng đơn cũ (đơn BE trả về không luôn
 * có `estimatedMinutes`); thiếu thì coi như dài một bước lưới slot.
 */
export function getVehicleBusyRanges(
  orders: Order[],
  options: {
    vehicleId: string;
    /** Đơn đang đổi lịch — chính nó không tự chặn giờ của nó. */
    excludeOrderId?: string;
    minutesOf?: (order: Order) => number;
  },
): VehicleBusyRange[] {
  const { vehicleId, excludeOrderId, minutesOf } = options;
  if (!vehicleId) return [];

  return getActiveOrders(orders)
    .filter(
      (o) =>
        o.vehicleId === vehicleId &&
        (!excludeOrderId || orderId(o) !== excludeOrderId),
    )
    .map((o) => {
      const startMs = new Date(o.scheduledAt).getTime();
      const minutes = minutesOf?.(o) ?? o.estimatedMinutes;
      return {
        order: o,
        startMs,
        endMs: startMs + normalizeMinutes(minutes) * MINUTE_MS,
      };
    })
    .filter((range) => Number.isFinite(range.startMs));
}

/**
 * Đơn đang chiếm khung giờ này của xe, `undefined` nếu đặt được.
 * So theo khoảng [bắt đầu, bắt đầu + thời lượng) vì một chiếc xe không thể nằm
 * ở hai lượt rửa chồng nhau — không chỉ so trùng đúng mốc giờ.
 */
export function findVehicleBusyConflict(
  slotIso: string,
  minutes: number | undefined,
  ranges: VehicleBusyRange[],
): VehicleBusyRange | undefined {
  if (ranges.length === 0) return undefined;
  const startMs = new Date(slotIso).getTime();
  if (!Number.isFinite(startMs)) return undefined;
  const endMs = startMs + normalizeMinutes(minutes) * MINUTE_MS;
  return ranges.find(
    (range) => startMs < range.endMs && endMs > range.startMs,
  );
}

function normalizeMinutes(minutes: number | undefined): number {
  const value = Number(minutes);
  return Number.isFinite(value) && value > 0
    ? Math.max(value, SLOT_STEP_MINUTES)
    : SLOT_STEP_MINUTES;
}

/**
 * BE chặn khách có quá nhiều đơn chưa kết thúc bằng lỗi 400 kèm message
 * "You already have 3 active orders (limit 3)" — số trong ngoặc là hạn mức.
 * Trả về hạn mức đó để toast nói đúng con số của BE thay vì hard-code ở FE.
 */
const ACTIVE_ORDER_LIMIT_MESSAGE =
  /already have\s+\d+\s+active orders?(?:\s*\(limit\s*(\d+)\))?/i;

export function getActiveOrderLimitReached(error: unknown): number | null {
  const matched = ACTIVE_ORDER_LIMIT_MESSAGE.exec(getRawServerMessage(error));
  if (!matched) return null;
  const limit = Number(matched[1]);
  return Number.isFinite(limit) && limit > 0 ? limit : MAX_ACTIVE_ORDERS;
}

/**
 * BE chặn đổi lịch quá số lần cho phép bằng lỗi 400 kèm message
 * "Reschedule limit reached (2)" — số trong ngoặc là hạn mức. Trả về hạn mức đó
 * để toast nói đúng con số của BE; thiếu ngoặc thì lấy hằng số mirror ở FE.
 */
const RESCHEDULE_LIMIT_MESSAGE = /reschedule limit reached(?:\s*\((\d+)\))?/i;

export function getRescheduleLimitReached(error: unknown): number | null {
  const matched = RESCHEDULE_LIMIT_MESSAGE.exec(getRawServerMessage(error));
  if (!matched) return null;
  const limit = Number(matched[1]);
  return Number.isFinite(limit) && limit > 0 ? limit : MAX_CUSTOMER_RESCHEDULE;
}

/** Câu thông báo hết hạn mức đơn — dùng chung cho mọi chỗ chặn trước/sau. */
export function activeOrderLimitMessage(limit = MAX_ACTIVE_ORDERS): {
  title: string;
  description: string;
} {
  return {
    title: `Bạn đang có ${limit} lịch hẹn chưa hoàn tất`,
    description: `WAVE chỉ cho mỗi khách giữ tối đa ${limit} lịch hẹn cùng lúc. Hãy rửa xong hoặc hủy một lịch hẹn rồi đặt tiếp.`,
  };
}
