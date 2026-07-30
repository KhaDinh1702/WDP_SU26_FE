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
import { formatCurrency, formatDate } from '@/lib/format';
import type { StatusTone } from '@/constants/order-status';
import type {
  Voucher,
  VoucherCampaignPublic,
  VoucherCampaignPublicStatus,
  VoucherStatus,
} from '@/types/voucher';

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
 * Mô tả ngắn mức ưu đãi của một CHIẾN DỊCH, ví dụ "Giảm 50.000đ",
 * "Giảm 20% (tối đa 100.000đ)", "Miễn phí dịch vụ".
 *
 * `fallbackCapVnd` là trần giảm của voucher cụ thể, dùng khi chiến dịch không
 * ghi `discountCapVnd`/`discountValue` — trang danh sách chiến dịch không có
 * voucher nào trong tay nên bỏ trống.
 */
export function campaignBenefitLabel(
  c: VoucherCampaignPublic,
  fallbackCapVnd?: number,
): string {
  switch (c.benefitType) {
    case 'percent_off': {
      const percent = c.discountValue ?? 0;
      const cap = c.discountCapVnd ?? fallbackCapVnd;
      return cap
        ? `Giảm ${percent}% (tối đa ${formatCurrency(cap)})`
        : `Giảm ${percent}%`;
    }
    case 'fixed_amount': {
      const amount = c.discountValue ?? fallbackCapVnd;
      return amount != null
        ? `Giảm ${formatCurrency(amount)}`
        : 'Giảm giá theo chương trình';
    }
    case 'free_service':
      return 'Miễn phí dịch vụ';
    default:
      return fallbackCapVnd != null
        ? `Giảm tối đa ${formatCurrency(fallbackCapVnd)}`
        : 'Ưu đãi theo chương trình';
  }
}

/**
 * Mô tả ngắn mức ưu đãi, ví dụ "Giảm 50.000đ", "Giảm 20% (tối đa 100.000đ)",
 * "Miễn phí dịch vụ". Voucher legacy (không có campaign) hiển thị theo trần giảm.
 */
export function voucherBenefitLabel(v: Voucher): string {
  const c = v.campaign;
  if (!c) return `Giảm tối đa ${formatCurrency(v.discountCapVnd)}`;
  return campaignBenefitLabel(c, v.discountCapVnd);
}

/** Điều kiện đơn tối thiểu của chiến dịch, rỗng nếu không đặt. */
export function campaignMinOrderLabel(c: VoucherCampaignPublic): string {
  const min = c.minOrderVnd ?? 0;
  return min > 0 ? `Đơn tối thiểu ${formatCurrency(min)}` : '';
}

/** Điều kiện đơn tối thiểu, rỗng nếu chiến dịch không đặt. */
export function voucherMinOrderLabel(v: Voucher): string {
  return v.campaign ? campaignMinOrderLabel(v.campaign) : '';
}

/** Khoảng hiệu lực của chiến dịch, ví dụ "20/01/2026 – 20/02/2026". */
export function campaignWindowLabel(c: VoucherCampaignPublic): string {
  if (!c.validFrom && !c.validUntil) return '';
  if (!c.validFrom) return `Đến ${formatDate(c.validUntil)}`;
  if (!c.validUntil) return `Từ ${formatDate(c.validFrom)}`;
  return `${formatDate(c.validFrom)} – ${formatDate(c.validUntil)}`;
}

/**
 * Nhãn + tông màu + khả năng nhận của từng trạng thái chiến dịch.
 * `claimable` chỉ đúng với `active`: BE chặn nhận từ chiến dịch chưa/đã hết
 * hiệu lực (`assertCampaignClaimable`), nên UI không được mời khách nhận.
 */
export const CAMPAIGN_STATUS_META: Record<
  VoucherCampaignPublicStatus,
  { label: string; badgeClass: string; claimable: boolean }
> = {
  active: {
    label: 'Đang diễn ra',
    badgeClass: 'bg-success/10 text-success',
    claimable: true,
  },
  scheduled: {
    label: 'Sắp diễn ra',
    badgeClass: 'bg-primary/10 text-primary',
    claimable: false,
  },
  paused: {
    label: 'Tạm dừng',
    badgeClass: 'bg-warning/10 text-warning',
    claimable: false,
  },
  ended: {
    label: 'Đã kết thúc',
    badgeClass: 'bg-muted text-muted-foreground',
    claimable: false,
  },
};

/**
 * Trạng thái nút "Nhận" của một chiến dịch, quyết định trước khi khách bấm.
 *
 * BE trả sẵn `alreadyClaimed` / `soldOut` / `remaining` đúng để làm việc này -
 * nhờ vậy không phải để khách bấm rồi mới ăn 409. Lưu ý `alreadyClaimed` VẮNG
 * với request ẩn danh nghĩa là "không biết", nên chỉ chặn khi nó `=== true`.
 */
export type CampaignClaimState =
  | 'claimable'
  | 'claimed'
  | 'sold_out'
  | 'not_running';

export function campaignClaimState(
  c: VoucherCampaignPublic,
): CampaignClaimState {
  if (!campaignStatusMeta(c.status).claimable) return 'not_running';
  if (c.alreadyClaimed === true) return 'claimed';
  if (c.soldOut === true || c.remaining === 0) return 'sold_out';
  return 'claimable';
}

/** Nhãn hiển thị trên nút/badge tương ứng với `campaignClaimState`. */
export const CAMPAIGN_CLAIM_LABEL: Record<CampaignClaimState, string> = {
  claimable: 'Nhận ưu đãi',
  claimed: 'Đã nhận',
  sold_out: 'Hết lượt',
  not_running: 'Chưa mở nhận',
};

/** Meta trạng thái an toàn cho dữ liệu lạ - rơi về "đã kết thúc". */
export function campaignStatusMeta(status?: string) {
  if (status && status in CAMPAIGN_STATUS_META) {
    return CAMPAIGN_STATUS_META[status as VoucherCampaignPublicStatus];
  }
  return CAMPAIGN_STATUS_META.ended;
}

/**
 * Chiến dịch có giới hạn phạm vi không (dịch vụ / loại xe / hạng).
 * Mảng RỖNG nghĩa là không giới hạn - đúng theo Swagger.
 */
export function campaignHasRestrictions(c: VoucherCampaignPublic): boolean {
  return Boolean(
    c.applicableServiceTypeIds?.length ||
      c.applicableVehicleTypeIds?.length ||
      c.allowedTierIds?.length,
  );
}

/**
 * Voucher có bị chiến dịch giới hạn phạm vi không (dịch vụ / loại xe / hạng).
 * Mảng RỖNG nghĩa là không giới hạn - đúng theo Swagger.
 */
export function hasVoucherRestrictions(v: Voucher): boolean {
  return v.campaign ? campaignHasRestrictions(v.campaign) : false;
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
