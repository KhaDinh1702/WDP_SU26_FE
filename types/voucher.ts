/**
 * Model voucher + chiến dịch voucher - mirror Swagger BE
 * (https://wash-auto.vercel.app/api/docs.json): `VoucherResponse`,
 * `VoucherListResponse`, `ClaimVoucher`, `GrantVoucherAdmin`, `BulkCreateVoucher`,
 * `BulkVoucherResult`, `RevokeVoucher`, `VoucherCampaign*`, `CampaignStatsResponse`.
 *
 * Voucher giờ do MỘT chiến dịch (campaign) định nghĩa luật: loại ưu đãi, mức giảm,
 * đơn tối thiểu, phạm vi dịch vụ/loại xe/hạng thành viên và chính sách cộng dồn.
 */

/** `VoucherStatusEnum`. */
export type VoucherStatus =
  | 'unused'
  | 'reserved'
  | 'used'
  | 'expired'
  | 'revoked';

/** `VoucherTypeEnum` - BE để mở, hiện dùng `free_wash`. */
export type VoucherType = 'free_wash' | string;

/** Kênh phát sinh voucher - `grantedSource` / campaign `source`. */
export type VoucherSource =
  | 'loyalty_milestone'
  | 'admin_grant'
  | 'campaign'
  | 'birthday'
  | 'referral'
  | 'winback'
  | 'legacy';

/** Loại ưu đãi của chiến dịch. */
export type VoucherBenefitType =
  | 'fixed_amount'
  | 'percent_off'
  | 'free_service';

/** Các khoản giảm khác còn được cộng dồn cùng voucher này. */
export type VoucherStackingPolicy =
  | 'none'
  | 'with_tier'
  | 'with_promotion'
  | 'with_tier_and_promotion';

/** Vòng đời chiến dịch (bản quản trị). */
export type VoucherCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'ended';

/**
 * Vòng đời chiến dịch nhìn từ phía khách - `draft` không bao giờ lộ ra.
 * Cũng đúng là tập trạng thái `GET /voucher-campaigns?status=` chấp nhận
 * (BE `BROWSABLE_CAMPAIGN_STATUSES`); truyền `draft` bị trả 400.
 */
export type VoucherCampaignPublicStatus = Exclude<
  VoucherCampaignStatus,
  'draft'
>;

/**
 * `VoucherCampaignPublic` - bản chiếu an toàn cho khách: chỉ phần trình bày và
 * luật khách cần biết. KHÔNG có budgetVnd, maxUsesTotal, publicClaimCode, source.
 * Được nhúng sẵn trong mỗi voucher của GET /me/vouchers.
 */
export interface VoucherCampaignPublic {
  id: string;
  title: string;
  description?: string;
  terms?: string;
  imageUrl?: string;
  /** Mã màu hex để tô thẻ voucher. */
  themeColor?: string;
  status: VoucherCampaignPublicStatus;
  benefitType: VoucherBenefitType;
  /** VND với fixed_amount; 1-100 với percent_off; free_service bỏ qua. */
  discountValue?: number;
  /** Chỉ percent_off. Không có = không chặn trần. */
  discountCapVnd?: number;
  minOrderVnd?: number;
  validFrom?: string;
  validUntil?: string;
  stackingPolicy?: VoucherStackingPolicy;
  /** RỖNG = mọi hạng đều dùng được. */
  allowedTierIds?: string[];
  /** RỖNG = mọi dịch vụ đều dùng được. */
  applicableServiceTypeIds?: string[];
  /** RỖNG = mọi loại xe đều dùng được. */
  applicableVehicleTypeIds?: string[];

  /**
   * Số voucher còn chưa ai nhận trong pool. CHỈ là tồn kho pool - không phải
   * ngân sách và cũng không phải `maxUsesTotal` (khách không được thấy hai thứ
   * đó). Có ở các endpoint /voucher-campaigns; VẮNG khi chiến dịch được nhúng
   * trong payload khác, ví dụ `VoucherResponse.campaign`.
   */
  remaining?: number;
  /** Viết tắt của `remaining === 0`, để thẻ hiện "Hết lượt" trước khi khách bấm. */
  soldOut?: boolean;
  /**
   * Khách đang đăng nhập đã dùng hết suất `maxUsesPerCustomer` của chiến dịch.
   * CHỈ được tính khi request có bearer token; VẮNG với request ẩn danh - lúc
   * đó nghĩa là "không biết" và KHÔNG được hiển thị thành "chưa nhận".
   */
  alreadyClaimed?: boolean;
}

/**
 * Tham số `GET /voucher-campaigns` - trang ưu đãi công khai.
 * `status` bỏ trống = BE mặc định `active` (các chương trình đang chạy).
 */
export interface VoucherCampaignPublicQuery {
  status?: VoucherCampaignPublicStatus;
  page?: number;
  /** Tối đa 100 theo guardrail BE. */
  limit?: number;
}

/**
 * `VoucherCampaignPublicListResponse` - GET /voucher-campaigns.
 * Phân trang do BE làm (khác /me/vouchers vốn trả mảng trần).
 */
export interface VoucherCampaignPublicListResponse {
  data: VoucherCampaignPublic[];
  meta: PaginationMeta;
}

/** `VoucherResponse`. */
export interface Voucher {
  id: string;
  /**
   * Chiến dịch định nghĩa luật cho voucher này. Chỉ vắng ở các bản ghi cũ
   * migration chưa backfill - khi đó rơi về hành vi legacy (chỉ có trần giảm,
   * không ràng buộc phạm vi).
   */
  campaignId?: string;
  /** Trống/không có = voucher pool chưa ai nhận. */
  customerId?: string;
  /** Luật + phần trình bày của chiến dịch, nhúng sẵn để ví voucher render 1 request. */
  campaign?: VoucherCampaignPublic;
  /** Chỉ có ở danh sách phía admin. */
  customerName?: string;
  customerEmail?: string;
  code: string;
  type: VoucherType;
  status: VoucherStatus;
  discountCapVnd: number;
  expiresAt: string;
  grantedReason?: string;
  /** Vắng ở voucher phát hành trước khi BE theo dõi kênh phát sinh. */
  grantedSource?: VoucherSource;
  grantedAt?: string;
  usedAt?: string;
  usedOrderId?: string;
  /** Có khi status = reserved. */
  reservedOrderId?: string;
  reservedUntil?: string;
  revokedAt?: string;
  revokeReason?: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `VoucherListResponse` - GET /admin/vouchers. */
export interface VoucherListResponse {
  data: Voucher[];
  meta?: PaginationMeta;
}

/** POST /me/vouchers/claim - `ClaimVoucher`. Mã không phân biệt hoa thường. */
export interface ClaimVoucherDto {
  code: string;
}

/** POST /admin/vouchers - `GrantVoucherAdmin`. */
export interface GrantVoucherPayload {
  customerId: string;
  /** Mã tuỳ chỉnh `^[A-Z0-9-]{3,30}$` (để trống = BE tự sinh). */
  code?: string;
  /** 1..200000, mặc định 100000. */
  discountCapVnd?: number;
  expiresAt?: string;
  /** Lý do cấp, lưu trên voucher để đối soát. 5-500 ký tự. */
  reason?: string;
}

/**
 * POST /admin/vouchers/bulk - `BulkCreateVoucher`.
 *
 * Khi có `campaignId`, chiến dịch nắm luật ("campaign owns the rules"):
 * `expiresAt` và `discountCapVnd` KHÔNG còn tác dụng, nên UI phải khoá hai ô đó
 * lại thay vì để admin tưởng mình đặt được.
 */
export interface BulkCreateVoucherPayload {
  /** 1..1000. */
  quantity: number;
  /** Tiền tố `^[A-Z0-9]{1,15}$`. Mã sinh ra: PREFIX-XXXXXXXXXX (hậu tố ngẫu nhiên). */
  prefix?: string;
  /**
   * Gắn lô voucher vào pool của một chiến dịch. Có nó thì thẻ ưu đãi mới hiện
   * cho khách và nút "Nhận" một chạm mới có hàng để rút.
   * BE chặn trước khi mint nếu lô vượt `maxUsesTotal` của chiến dịch.
   */
  campaignId?: string;
  /** 1..200000, mặc định 100000. BỎ QUA khi có `campaignId`. */
  discountCapVnd?: number;
  /** BỎ QUA khi có `campaignId` - `validUntil` của chiến dịch thắng. */
  expiresAt?: string;
  /** Lưu trên mọi voucher trong lô. Mặc định "Lô phát hành <PREFIX>". */
  reason?: string;
}

/** `BulkVoucherResult`. */
export interface BulkVoucherResult {
  count: number;
  vouchers: Voucher[];
}

/** PATCH /admin/vouchers/:id/revoke - `RevokeVoucher`. */
export interface RevokeVoucherDto {
  /** 5-500 ký tự. */
  reason: string;
}

/** GET /admin/vouchers/stats. */
export interface VoucherStats {
  total: number;
  /** Chưa ai nhận. */
  inPool: number;
  /** Đã nhận, chưa dùng. */
  claimed: number;
  /** Đang giữ cho đơn chưa hoàn tất. */
  reserved: number;
  used: number;
  /** Hết hạn tự nhiên (khách không dùng). */
  expired: number;
  /** Bị admin thu hồi - KHÔNG gộp vào expired. */
  revoked: number;
}

/** GET /admin/vouchers/batches. */
export interface VoucherBatch {
  batchKey: string;
  prefix: string;
  createdAt: string;
  expiresAt: string;
  discountCapVnd: number;
  total: number;
  inPool: number;
  claimed: number;
  used: number;
  expired: number;
}

/** `VoucherCampaignRules` - phần dùng chung cho create/update/response. */
export interface VoucherCampaignRules {
  /** Tên nội bộ, duy nhất. 3-120 ký tự. */
  name?: string;
  title?: string;
  description?: string;
  terms?: string;
  imageUrl?: string;
  themeColor?: string;
  benefitType?: VoucherBenefitType;
  discountValue?: number;
  discountCapVnd?: number;
  minOrderVnd?: number;
  validFrom?: string;
  validUntil?: string;
  stackingPolicy?: VoucherStackingPolicy;
  /** Không có = không giới hạn. */
  maxUsesTotal?: number;
  maxUsesPerCustomer?: number;
  /** Không có = không giới hạn ngân sách. */
  budgetVnd?: number;
  /** Mã khách gõ để nhận từ pool. `^[A-Z0-9]{3,20}$`, duy nhất. */
  publicClaimCode?: string;
  allowedTierIds?: string[];
  applicableServiceTypeIds?: string[];
  applicableVehicleTypeIds?: string[];
}

/** POST /admin/voucher-campaigns - `CreateVoucherCampaign`. Tạo ở trạng thái DRAFT. */
export interface CreateVoucherCampaignDto extends VoucherCampaignRules {
  name: string;
  title: string;
  benefitType: VoucherBenefitType;
  validFrom: string;
  validUntil: string;
  source?: VoucherSource;
}

/**
 * PATCH /admin/voucher-campaigns/:id - `UpdateVoucherCampaign`.
 * Mọi field tuỳ chọn; `status` KHÔNG sửa ở đây (dùng activate/pause/end).
 */
export type UpdateVoucherCampaignDto = VoucherCampaignRules;

/** `VoucherCampaignResponse`. */
export interface VoucherCampaign extends VoucherCampaignRules {
  id: string;
  status: VoucherCampaignStatus;
  source?: VoucherSource;
  createdAt?: string;
}

/** `VoucherCampaignListResponse`. */
export interface VoucherCampaignListResponse {
  data: VoucherCampaign[];
  meta?: PaginationMeta;
}

/** GET /admin/voucher-campaigns/:id/stats - `CampaignStatsResponse`. */
export interface CampaignStats {
  campaignId: string;
  name: string;
  status: VoucherCampaignStatus;
  /** Voucher đã phát hành. */
  issued: number;
  /** Đã tới tay khách (claimed/reserved/used/expired). */
  claimed: number;
  /** Còn trong kho. */
  inPool: number;
  /** Đang giữ cho một đơn chưa hoàn tất. */
  reserved: number;
  used: number;
  /** Hết hạn mà không dùng. */
  expired: number;
  /** Bị admin thu hồi. KHÔNG tính là expired. */
  revoked: number;
  /** used / claimed. */
  redemptionRatePercent: number;
  totalDiscountVnd: number;
  /** Null = không đặt ngân sách. */
  budgetVnd?: number;
  budgetUsedVnd: number;
  budgetRemainingVnd: number;
  /** maxUsesTotal trừ issued. Null = không giới hạn. */
  usageLimitRemaining?: number;
  averageOrderBeforeDiscountVnd: number;
  averageOrderAfterDiscountVnd: number;
  cachedRedeemedVnd: number;
  /** False → cần chạy job `campaign-reconcile`. */
  countersInSync: boolean;
}
