/**
 * Nguồn tên hạng thành viên DUY NHẤT của toàn app.
 *
 * Trước đây mỗi màn tự chế một bảng tên, nên cùng một hạng hiện ra bốn kiểu:
 * landing gọi là "Basic", trang loyalty gọi "Thành viên", dashboard admin và
 * navbar để lọt nguyên enum "None" của BE ra cho khách đọc. File này cũng còn
 * kẹt ở mô hình 4 hạng cũ (member/silver/gold/platinum) — thiếu bronze, thừa
 * platinum — nên `getTierMeta('None')` không khớp gì và luôn rơi về fallback.
 *
 * Khoá viết thường, khớp `TierNameEnum` của BE ('None' | 'Bronze' | 'Silver' |
 * 'Gold') sau khi `.toLowerCase()`. Thêm hạng mới thì sửa đúng một chỗ này.
 */
export const TIERS = {
  NONE: 'none',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
} as const;

export type Tier = (typeof TIERS)[keyof typeof TIERS];

export const TIER_META: Record<
  Tier,
  { label: string; badgeClass: string; gradientClass: string }
> = {
  // "None" là hạng khởi điểm, không phải "chưa có hạng" — gọi thẳng là Thành
  // viên để khách không đọc phải chữ vô nghĩa.
  none: {
    label: 'Thành viên',
    badgeClass: 'bg-primary/10 text-primary',
    gradientClass: 'from-primary/20 via-primary/10 to-primary/30',
  },
  bronze: {
    label: 'Đồng',
    badgeClass: 'bg-amber-100 text-amber-700',
    gradientClass: 'from-amber-500/30 via-amber-200/20 to-amber-600/30',
  },
  silver: {
    label: 'Bạc',
    badgeClass: 'bg-slate-100 text-slate-600',
    gradientClass: 'from-slate-300 via-slate-100 to-slate-400',
  },
  gold: {
    label: 'Vàng',
    badgeClass: 'bg-yellow-100 text-yellow-700',
    gradientClass: 'from-amber-400 via-yellow-200 to-amber-500',
  },
};

/** Lấy meta hạng an toàn, fallback về hạng khởi điểm. */
export function getTierMeta(tier?: string | null) {
  const key = tier?.toLowerCase();
  if (key && key in TIER_META) return TIER_META[key as Tier];
  return TIER_META.none;
}

/** Tên hạng hiển thị cho người dùng. Đừng render thẳng `tierName` từ API. */
export function getTierLabel(tier?: string | null): string {
  return getTierMeta(tier).label;
}
