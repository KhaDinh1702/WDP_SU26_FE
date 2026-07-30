/** Hạng thành viên - `LoyaltyAccountResponse.tierName` / `TierConfigResponse.tierName`. */
export type TierName = 'None' | 'Bronze' | 'Silver' | 'Gold';

/** Khớp `LoyaltyAccountResponse` (Swagger BE). */
export interface LoyaltyAccount {
  id: string;
  customerId: string;
  tierConfigId: string;
  tierName: TierName | string;
  /** Điểm xét hạng. Reset mỗi năm. */
  pointsBalance: number;
  /**
   * Số lần rửa hợp lệ tính từ voucher thưởng gần nhất.
   * KHÔNG reset theo năm - tiến độ nhận voucher độc lập với năm dương lịch.
   */
  successfulWashesTowardVoucher: number;
  /** Tổng số lần rửa hoàn thành trọn đời (không reset). */
  totalSuccessfulWashes: number;
  lastAnnualResetAt?: string;

  /** Thứ hạng của hạng hiện tại. Số lớn hơn = hạng cao hơn. */
  currentTierRank?: number;
  /** Không có khi đã ở hạng cao nhất. */
  nextTier?: TierName | string;
  /** Không có khi đã ở hạng cao nhất. */
  pointsToNextTier?: number;
  /** Tiến độ trong dải điểm của HẠNG HIỆN TẠI, 0-100. */
  progressPercent?: number;
  /** Số lượt rửa cần cho voucher thưởng kế tiếp - theo hạng, do BE quyết định. */
  washesRequiredForNextVoucher?: number;
  washesRemainingForNextVoucher?: number;
  /**
   * Giá trị ước tính của voucher thưởng kế tiếp, tính bằng đúng công thức BE
   * dùng khi phát voucher. BE tính sẵn - KHÔNG tự suy lại ở client.
   */
  estimatedNextVoucherVnd?: number;
  /** Mọi điểm từng nhận. Không bị reset theo năm. */
  lifetimePoints?: number;
  lifetimeSpendVnd?: number;
  /** Tổng số tiền các khoản giảm đã tiết kiệm cho khách, trọn đời. */
  totalSavedVnd?: number;
}

export type LoyaltyTransactionType =
  | 'earn_completed'
  | 'deduct_no_show'
  | 'annual_reset'
  | 'voucher_granted'
  | 'tier_changed';

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: LoyaltyTransactionType;
  pointsDelta: number;
  balanceAfter: number;
  orderId?: string;
  voucherId?: string;
  previousTierConfigId?: string;
  newTierConfigId?: string;
  reason?: string;
  createdAt: string;
}

/** Khớp `TierConfigResponse` (Swagger BE). */
export interface TierConfig {
  id: string;
  tierName: TierName | string;
  /** Điểm tối thiểu để đạt hạng này. */
  minLoyaltyPoints: number;
  bookingWindowDays: number;
  priorityLevel: number;
  pointsPer1000Vnd: number; // Points awarded per 1,000 VND spent
  discountPercent: number; // Discount percent applied per wash (0–100)
  isActive: boolean;

  // ─── Luật voucher thưởng theo hạng ───
  /** Số lượt rửa hợp lệ cần để nhận một voucher thưởng. */
  washesPerRewardVoucher?: number;
  /** % chi tiêu tích luỹ mà voucher thưởng trị giá. */
  voucherRewardRatePercent?: number;
  /** Hệ số nhân phần thưởng. >1 nghĩa là hạng cao được thưởng nhiều hơn. */
  voucherRewardMultiplier?: number;
  voucherRewardFloorVnd?: number;
  voucherRewardCeilVnd?: number;
  /** Đơn dưới mức này không được tính vào mốc thưởng. */
  minimumValidWashVnd?: number;
  voucherExpiryDays?: number;
  /** 0 = không có quà sinh nhật. */
  birthdayVoucherVnd?: number;
  exclusiveCampaignAccess?: boolean;
}
