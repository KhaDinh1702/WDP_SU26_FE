'use client';

import { getMyLoyalty, getTierConfigs } from '@/lib/customer-api';
import { LoyaltyAccount, TierConfig } from '@/types/loyalty';
import { useQuery } from '@tanstack/react-query';
import {
  Crown,
  Sparkles,
  Award,
  Calendar,
  Coins,
  TrendingUp,
  Info,
  Ticket,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
// Thẻ hạng + bảng màu dùng chung; tên hạng lấy từ nguồn duy nhất ở constants.
import LoyaltyCard, { tierStyles } from '@/components/profile/LoyaltyCard';
import { getTierLabel } from '@/constants/tiers';

export default function LoyaltyPage() {
  // ─── React Query ─────────────────────────────────────────
  const {
    data: loyaltyData,
    isLoading: isLoyaltyLoading,
    error: loyaltyError,
  } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: getMyLoyalty,
  });

  const { data: tierConfigsData, isLoading: isTiersLoading } = useQuery({
    queryKey: ['tier-configs'],
    queryFn: getTierConfigs,
  });

  const loyalty: LoyaltyAccount | null =
    loyaltyData?.data?.data ?? loyaltyData?.data ?? null;
  const tiers: TierConfig[] =
    tierConfigsData?.data?.data ?? tierConfigsData?.data ?? [];

  const isLoading = isLoyaltyLoading || isTiersLoading;

  // ─── Logic helper ────────────────────────────────────────
  const currentTierName = (loyalty?.tierName ?? 'None').toLowerCase();

  // Find user's current tier config and the next tier config
  const currentTierConfig = tiers.find(
    (t) => t.tierName.toLowerCase() === currentTierName,
  );

  // Sort tiers by priority level ascending
  const sortedTiers = [...tiers].sort(
    (a, b) => a.priorityLevel - b.priorityLevel,
  );

  const currentTierIndex = sortedTiers.findIndex(
    (t) => t.tierName.toLowerCase() === currentTierName,
  );

  const nextTierConfig =
    currentTierIndex !== -1 && currentTierIndex < sortedTiers.length - 1
      ? sortedTiers[currentTierIndex + 1]
      : null;

  // ─── Tiến độ voucher thưởng ─────────────────────────────────
  // Mốc lượt rửa và giá trị voucher kế tiếp do BE tính theo hạng
  // (`washesRequiredForNextVoucher`, `estimatedNextVoucherVnd`) - không tự suy
  // lại ở client. Số 10 chỉ là dự phòng khi dữ liệu chưa về.
  const washesPerVoucher = loyalty?.washesRequiredForNextVoucher ?? 10;
  const towardVoucher = loyalty?.successfulWashesTowardVoucher ?? 0;
  const washesToVoucher =
    loyalty?.washesRemainingForNextVoucher ??
    Math.max(washesPerVoucher - towardVoucher, 0);
  const voucherPct = Math.min((towardVoucher / washesPerVoucher) * 100, 100);

  // ─── Tiến độ thăng hạng (theo điểm tích lũy) ────────────────
  const pointsBalance = loyalty?.pointsBalance ?? 0;
  const pointsToNextTier =
    loyalty?.pointsToNextTier ??
    (nextTierConfig
      ? Math.max(nextTierConfig.minLoyaltyPoints - pointsBalance, 0)
      : 0);
  const tierPct =
    nextTierConfig && nextTierConfig.minLoyaltyPoints > 0
      ? Math.min((pointsBalance / nextTierConfig.minLoyaltyPoints) * 100, 100)
      : 100;

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] gap-3'>
        <Spinner className='size-8 text-primary' />
        <p className='text-sm text-muted-foreground font-semibold'>
          Đang tải dữ liệu thành viên...
        </p>
      </div>
    );
  }

  if (loyaltyError) {
    return (
      <div className='bg-destructive/10 dark:bg-red-950/20 border border-destructive/30 dark:border-red-900 rounded-xl p-6 text-center text-destructive dark:text-destructive space-y-3 max-w-lg mx-auto mt-8'>
        <Info className='w-8 h-8 mx-auto' />
        <h3 className='font-heading font-bold text-lg'>Đã xảy ra lỗi</h3>
        <p className='text-sm'>
          Không thể kết nối đến máy chủ để lấy thông tin Loyalty. Vui lòng thử
          lại sau.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-8 animate-fade-in'>
      {/* Page Header */}
      <div>
        <h1 className='font-heading text-2xl font-semibold text-foreground flex items-center gap-2'>
          <Award className='w-7 h-7 text-primary' /> Khách Hàng Thân Thiết
        </h1>
        <p className='text-sm text-muted-foreground'>
          Tích điểm qua mỗi lần rửa để nâng hạng, và cứ {washesPerVoucher} lượt
          rửa hợp lệ nhận ngay voucher thưởng — giá trị thay đổi theo hạng và
          mức chi tiêu của bạn.
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Left Column: E-Card & Progress */}
        <div className='lg:col-span-7 space-y-6'>
          {/* E-Membership Card */}
          <div className='max-w-xl'>
            <LoyaltyCard loyalty={loyalty} />
          </div>

          {/* Voucher & Tier Progress Card */}
          <Card className='border-none shadow-xl shadow-black/5 rounded-xl overflow-hidden bg-white/80 backdrop-blur-md'>
            <CardContent className='p-6 space-y-6'>
              {/* Tiến độ voucher rửa miễn phí */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h3 className='font-heading font-bold text-foreground flex items-center gap-2'>
                      <Ticket className='w-5 h-5 text-primary' /> Tiến Độ
                      Voucher Thưởng
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                      Cứ {washesPerVoucher} lượt rửa hợp lệ, bạn nhận một voucher
                      thưởng tính theo chi tiêu của các lượt đó.
                    </p>
                  </div>
                  <span className='font-semibold text-primary text-base shrink-0'>
                    {towardVoucher}/{washesPerVoucher}
                  </span>
                </div>
                <div className='h-3 bg-muted rounded-full overflow-hidden relative border border-border/20'>
                  <div
                    className='h-full bg-linear-to-r from-primary to-blue-600 rounded-full transition-all duration-500'
                    style={{ width: `${voucherPct}%` }}
                  />
                </div>
                <div className='bg-[#FFFBF2] border border-[#F9E1B2] rounded-xl p-4 flex items-start gap-3 text-[#856404] text-xs sm:text-sm shadow-xs'>
                  <Sparkles className='w-5 h-5 text-orange-400 shrink-0 mt-0.5' />
                  {/* Giá trị voucher kế tiếp do BE tính sẵn - không suy lại ở client. */}
                  <p>
                    Còn{' '}
                    <strong className='text-[#856404]'>
                      {washesToVoucher}
                    </strong>{' '}
                    lượt rửa hợp lệ nữa để nhận <strong>voucher thưởng</strong>
                    {loyalty?.estimatedNextVoucherVnd
                      ? ` trị giá khoảng ${formatCurrency(loyalty.estimatedNextVoucherVnd)}`
                      : ''}
                    !
                  </p>
                </div>
              </div>

              {/* Tiến độ thăng hạng theo điểm */}
              <div className='space-y-3 border-t border-border/50 pt-5'>
                <div className='flex items-center justify-between gap-3'>
                  <h3 className='font-heading font-bold text-foreground flex items-center gap-2'>
                    <TrendingUp className='w-5 h-5 text-primary' /> Tiến Độ
                    Thăng Hạng
                  </h3>
                  <span className='font-semibold text-primary text-base shrink-0'>
                    {pointsBalance.toLocaleString()}{' '}
                    <span className='text-xs font-semibold text-muted-foreground'>
                      PTS
                    </span>
                  </span>
                </div>
                <div className='h-3 bg-muted rounded-full overflow-hidden relative border border-border/20'>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      nextTierConfig
                        ? 'bg-linear-to-r from-primary to-blue-600'
                        : 'bg-linear-to-r from-cyan-500 to-blue-700'
                    }`}
                    style={{ width: `${tierPct}%` }}
                  />
                </div>
                {nextTierConfig ? (
                  <div className='bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3 text-foreground/80 text-xs sm:text-sm'>
                    <Crown className='w-5 h-5 text-primary shrink-0 mt-0.5' />
                    <p>
                      Còn{' '}
                      <strong className='text-primary'>
                        {pointsToNextTier.toLocaleString()}
                      </strong>{' '}
                      điểm nữa để lên hạng{' '}
                      <strong className='text-primary capitalize'>
                        {getTierLabel(nextTierConfig.tierName)}
                      </strong>{' '}
                      (cần {nextTierConfig.minLoyaltyPoints.toLocaleString()}{' '}
                      điểm).
                    </p>
                  </div>
                ) : (
                  <div className='bg-cyan-50/50 border border-cyan-100 rounded-xl p-4 flex items-start gap-3 text-cyan-800 text-xs sm:text-sm shadow-xs'>
                    <Crown className='w-5 h-5 text-cyan-500 shrink-0 mt-0.5' />
                    <p>
                      Bạn đang ở hạng cao nhất. Tiếp tục tích điểm để duy trì
                      đặc quyền!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Key Benefits Brief */}
        <div className='lg:col-span-5'>
          <Card className='border-none shadow-xl shadow-black/5 rounded-xl overflow-hidden bg-white/80 backdrop-blur-md h-full flex flex-col justify-between'>
            <div>
              <CardHeader className='border-b border-border/50 pb-4'>
                <CardTitle className='text-base font-bold flex items-center gap-2'>
                  <Crown className='w-5 h-5 text-primary' /> Đặc Quyền Hiện Tại
                  Của Bạn
                </CardTitle>
              </CardHeader>
              <CardContent className='p-6 space-y-4'>
                {currentTierConfig ? (
                  <div className='space-y-4'>
                    <div className='flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10'>
                      <div className='p-2 rounded-xl bg-card shadow-xs text-primary'>
                        <Award className='w-5 h-5' />
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Ưu đãi giảm giá
                        </p>
                        <p className='text-sm font-bold text-foreground'>
                          Giảm {currentTierConfig.discountPercent}% cho tất cả
                          dịch vụ rửa xe
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3 p-3 rounded-xl bg-info/10 border border-info/30'>
                      <div className='p-2 rounded-xl bg-card shadow-xs text-blue-600'>
                        <Calendar className='w-5 h-5' />
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Thời gian đặt lịch trước
                        </p>
                        <p className='text-sm font-bold text-foreground'>
                          Đặt lịch trước tối đa{' '}
                          {currentTierConfig.bookingWindowDays} ngày
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/30'>
                      <div className='p-2 rounded-xl bg-card shadow-xs text-warning'>
                        <Coins className='w-5 h-5' />
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Hệ số tích điểm
                        </p>
                        <p className='text-sm font-bold text-foreground'>
                          Nhận {currentTierConfig.pointsPer1000Vnd} PTS cho mỗi
                          1.000đ thanh toán
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground text-center py-6'>
                    Không có cấu hình đặc quyền hạng của bạn.
                  </p>
                )}
              </CardContent>
            </div>

            <div className='p-6 border-t border-border/50 bg-muted/20'>
              <div className='flex gap-2 items-center text-xs text-muted-foreground'>
                <Info className='w-4 h-4 shrink-0 text-muted-foreground' />
                <p>
                  Hạng hội viên được nâng tự động theo tổng điểm tích lũy. Điểm
                  được cộng sau mỗi đơn rửa hoàn thành.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tiers Comparison Grid */}
      <div className='space-y-4'>
        <div>
          <h2 className='font-heading text-lg font-bold text-foreground flex items-center gap-2'>
            <Crown className='w-5 h-5 text-yellow-500' /> Bảng So Sánh Quyền Lợi
            Các Hạng Thành Viên
          </h2>
          <p className='text-xs text-muted-foreground'>
            Khám phá lộ trình thăng hạng và các quyền lợi độc quyền kèm theo.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
          {sortedTiers.map((t) => {
            const isMyTier = t.tierName.toLowerCase() === currentTierName;
            const style =
              tierStyles[t.tierName.toLowerCase()] || tierStyles.none;

            return (
              <div
                key={t.id}
                className={`bg-card rounded-xl border shadow-xs overflow-hidden flex flex-col justify-between relative transition-all duration-300 ${
                  isMyTier
                    ? 'border-primary ring-2 ring-primary/20 scale-[1.02] -translate-y-1 shadow-md'
                    : 'border-border/60 hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                {isMyTier && (
                  <div className='absolute top-0 right-0 bg-primary text-white text-[9px] font-semibold uppercase tracking-wider py-1 px-3 rounded-bl-2xl shadow-xs z-10 flex items-center gap-1'>
                    <Crown className='w-3 h-3' /> Hạng của bạn
                  </div>
                )}

                {/* Header of Tier Config Card */}
                <div
                  className={`bg-gradient-to-br ${style.gradient} p-5 text-white relative overflow-hidden`}
                >
                  <div className='absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -mr-6 -mt-6' />
                  <Crown className='w-6 h-6 mb-2 relative z-10' />
                  <h3 className='font-heading font-semibold text-lg capitalize tracking-wide relative z-10'>
                    {getTierLabel(t.tierName)}
                  </h3>
                  <p className='text-[10px] text-white/70 mt-1 relative z-10 flex items-center gap-1 font-medium'>
                    <TrendingUp className='w-3 h-3' /> Cần{' '}
                    {t.minLoyaltyPoints.toLocaleString()} điểm
                  </p>
                </div>

                {/* Details list */}
                <div className='p-5 flex flex-col gap-4 bg-white/80'>
                  <div className='space-y-3.5'>
                    <div className='flex justify-between items-center text-xs'>
                      <span className='text-muted-foreground font-medium'>
                        Ưu đãi giảm giá
                      </span>
                      <span className='font-semibold text-primary text-sm'>
                        {t.discountPercent}%
                      </span>
                    </div>
                    <div className='flex justify-between items-center text-xs'>
                      <span className='text-muted-foreground font-medium'>
                        Đặt lịch trước
                      </span>
                      <span className='font-bold text-foreground'>
                        {t.bookingWindowDays} ngày
                      </span>
                    </div>
                    <div className='flex justify-between items-center text-xs'>
                      <span className='text-muted-foreground font-medium'>
                        Tỉ lệ tích điểm
                      </span>
                      <span className='font-bold text-foreground'>
                        {t.pointsPer1000Vnd} PTS / 1.000đ
                      </span>
                    </div>
                  </div>

                  <div className='pt-3 border-t border-border/40 text-center'>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        t.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-destructive'
                      }`}
                    >
                      {t.isActive ? 'Đang hoạt động' : 'Tạm khoá'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
