/**
 * Trình bày voucher dùng chung - suy ra từ `campaign` nhúng trong `VoucherResponse`.
 *
 * Voucher giờ do một chiến dịch định nghĩa luật (`benefitType`, `discountValue`,
 * `discountCapVnd`, `minOrderVnd`, phạm vi áp dụng). Những voucher cũ mà migration
 * chưa backfill thì không có `campaign` và rơi về hành vi legacy: chỉ có trần
 * giảm `discountCapVnd`, không ràng buộc phạm vi.
 *
 * Số tiền giảm THỰC TẾ luôn do BE tính (POST /me/orders/preview). Các hàm ở đây
 * chỉ để hiển thị, không được dùng thay cho preview.
 */
import { formatCurrency } from '@/lib/format';
import type { StatusTone } from '@/constants/order-status';
import type { Voucher, VoucherStatus } from '@/types/voucher';

export const VOUCHER_TYPE_LABEL: Record<string, string> = {
  free_wash: 'Rửa xe miễn phí',
};

/** Nhãn + tông màu cho từng trạng thái voucher (`VoucherStatusEnum`). */
export const VOUCHER_STATUS_META: Record<
  VoucherStatus,
  { label: string; tone: StatusTone }
> = {
  unused: { label: 'Chưa sử dụng', tone: 'success' },
  reserved: { label: 'Đang giữ cho đơn', tone: 'warning' },
  used: { label: 'Đã sử dụng', tone: 'muted' },
  expired: { label: 'Hết hạn', tone: 'destructive' },
  revoked: { label: 'Đã thu hồi', tone: 'destructive' },
};

/**
 * Trạng thái để hiển thị. `reserved` giữ nguyên vì đó là trạng thái riêng của
 * BE (voucher đang bị một đơn chưa hoàn tất giữ chỗ), không phải "chưa dùng".
 * Chỉ suy diễn thêm một điều: voucher `unused` mà đã qua hạn thì coi là hết hạn,
 * phòng khi cron của BE chưa kịp quét.
 */
export function effectiveVoucherStatus(v: Voucher): VoucherStatus {
  if (v.status === 'unused' && new Date(v.expiresAt).getTime() < Date.now()) {
    return 'expired';
  }
  return v.status;
}

/** Chỉ voucher `unused` còn hạn mới áp được vào đơn mới. */
export function isVoucherUsable(v: Voucher): boolean {
  return effectiveVoucherStatus(v) === 'unused';
}

/** Tiêu đề voucher: ưu tiên tiêu đề chiến dịch, không có thì rơi về nhãn theo type. */
export function voucherTitle(v: Voucher): string {
  return v.campaign?.title ?? VOUCHER_TYPE_LABEL[v.type] ?? v.type;
}

/**
 * Mô tả ngắn mức ưu đãi, ví dụ "Giảm 50.000 ₫", "Giảm 20% (tối đa 100.000 ₫)",
 * "Miễn phí dịch vụ". Voucher legacy (không có campaign) hiển thị theo trần giảm.
 */
export function voucherBenefitLabel(v: Voucher): string {
  const c = v.campaign;
  if (!c) return `Giảm tối đa ${formatCurrency(v.discountCapVnd)}`;

  switch (c.benefitType) {
    case 'percent_off': {
      const percent = c.discountValue ?? 0;
      const cap = c.discountCapVnd ?? v.discountCapVnd;
      return cap
        ? `Giảm ${percent}% (tối đa ${formatCurrency(cap)})`
        : `Giảm ${percent}%`;
    }
    case 'fixed_amount':
      return `Giảm ${formatCurrency(c.discountValue ?? v.discountCapVnd)}`;
    case 'free_service':
      return 'Miễn phí dịch vụ';
    default:
      return `Giảm tối đa ${formatCurrency(v.discountCapVnd)}`;
  }
}

/** Điều kiện đơn tối thiểu, rỗng nếu chiến dịch không đặt. */
export function voucherMinOrderLabel(v: Voucher): string {
  const min = v.campaign?.minOrderVnd ?? 0;
  return min > 0 ? `Đơn tối thiểu ${formatCurrency(min)}` : '';
}

/**
 * Voucher có bị chiến dịch giới hạn phạm vi không (dịch vụ / loại xe / hạng).
 * Mảng RỖNG nghĩa là không giới hạn - đúng theo Swagger.
 */
export function hasVoucherRestrictions(v: Voucher): boolean {
  const c = v.campaign;
  if (!c) return false;
  return Boolean(
    c.applicableServiceTypeIds?.length ||
      c.applicableVehicleTypeIds?.length ||
      c.allowedTierIds?.length,
  );
}

/**
 * Voucher có áp được cho một dịch vụ / loại xe cụ thể không, theo phạm vi chiến
 * dịch. Đây chỉ là bộ lọc hiển thị để khỏi mời khách chọn voucher chắc chắn hỏng;
 * phán quyết cuối cùng vẫn là của BE ở preview/create.
 */
export function isVoucherApplicableTo(
  v: Voucher,
  ctx: { serviceTypeId?: string; vehicleTypeId?: string },
): boolean {
  const c = v.campaign;
  if (!c) return true;

  const services = c.applicableServiceTypeIds ?? [];
  if (services.length && ctx.serviceTypeId && !services.includes(ctx.serviceTypeId)) {
    return false;
  }

  const vehicles = c.applicableVehicleTypeIds ?? [];
  if (vehicles.length && ctx.vehicleTypeId && !vehicles.includes(ctx.vehicleTypeId)) {
    return false;
  }

  return true;
}
