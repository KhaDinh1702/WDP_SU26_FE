'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, Crown, Star, CalendarDays, Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTierConfigs } from '@/lib/customer-api';
import { formatNumber } from '@/lib/format';
import { getTierLabel } from '@/constants/tiers';

interface TierConfig {
  id: string;
  tierName: string; // None | Bronze | Silver | Gold
  minLoyaltyPoints: number;
  bookingWindowDays: number;
  pointsPer1000Vnd: number;
  discountPercent: number; // chỉ áp dụng trong khung giờ vàng
  isActive: boolean;
}

// Chỉ còn phần tạo hình. Tên hạng lấy từ constants/tiers.ts — trang này từng
// tự gọi hạng None là "Basic" trong khi phần còn lại của app gọi "Thành viên".
const TIER_VISUALS: Record<
  string,
  { icon: typeof Star; accent: string; highlight?: boolean }
> = {
  None: {
    icon: Star,
    accent: 'bg-muted text-muted-foreground',
  },
  Bronze: {
    icon: Star,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  Silver: {
    icon: Star,
    accent: 'bg-slate-400/15 text-slate-500 dark:text-slate-300',
  },
  Gold: {
    icon: Crown,
    accent: 'bg-primary/10 text-primary',
    highlight: true,
  },
};

const DEFAULT_VISUALS = {
  icon: Star,
  accent: 'bg-muted text-muted-foreground',
  highlight: false,
};

export function LoyaltyTiersSection() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tier-configs-public'],
    queryFn: async () => {
      const res = await getTierConfigs();
      return (res.data?.data ?? res.data ?? []) as TierConfig[];
    },
  });

  const tiers = (data ?? [])
    .filter((t) => t.isActive)
    .sort((a, b) => a.minLoyaltyPoints - b.minLoyaltyPoints);

  return (
    <section
      id='loyalty'
      className='relative overflow-hidden bg-background px-4 py-12 sm:py-16'
    >
      {/* Vệt sáng nền, thuần trang trí */}
      <div
        aria-hidden
        className='pointer-events-none absolute -top-24 left-1/2 h-72 w-2xl -translate-x-1/2 rounded-full bg-primary/5 blur-3xl'
      />

      <div className='relative z-10 mx-auto max-w-7xl'>
        <div className='mb-12 text-center'>
          <div className='mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-primary uppercase'>
            <Crown className='size-4' />
            Chương trình thành viên
          </div>
          <h1 className='font-heading text-[1.75rem] sm:text-4xl lg:text-5xl text-foreground leading-tight tracking-tight'>
            Hạng thành viên & <span className='text-primary'>đặc quyền</span>
          </h1>
          <p className='mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg pt-5'>
            Tích điểm qua mỗi lần rửa để tự động lên hạng. Hạng càng cao, ưu đãi
            giờ vàng và cửa sổ đặt lịch càng lớn.
          </p>
        </div>

        {isLoading ? (
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='h-104 animate-pulse rounded-2xl border border-border bg-muted/40'
              />
            ))}
          </div>
        ) : isError || tiers.length === 0 ? (
          <div className='mx-auto max-w-md rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-center'>
            <p className='text-sm text-muted-foreground'>
              Chưa tải được thông tin hạng thành viên. Vui lòng thử lại sau.
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6'>
            {tiers.map((tier) => {
              const meta = {
                ...(TIER_VISUALS[tier.tierName] ?? DEFAULT_VISUALS),
                label: getTierLabel(tier.tierName),
              };
              const Icon = meta.icon;
              const highlight = meta.highlight;

              return (
                <article
                  key={tier.id}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-1',
                    highlight
                      ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border shadow-xs hover:border-primary/30 hover:shadow-md',
                  )}
                >
                  {/* Nền loang nhẹ cho hạng cao nhất */}
                  {highlight && (
                    <div
                      aria-hidden
                      className='pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/8 to-transparent'
                    />
                  )}

                  {/* Header */}
                  <div className='relative border-b border-border p-6 pb-5'>
                    {highlight && (
                      <div className='absolute top-6 right-6 rounded-full bg-primary px-2.5 py-1 text-[11px] leading-none font-semibold text-primary-foreground shadow-sm'>
                        Hạng cao nhất
                      </div>
                    )}

                    <div
                      className={cn(
                        'mb-4 flex size-11 items-center justify-center rounded-xl',
                        meta.accent,
                      )}
                    >
                      <Icon className='size-5' />
                    </div>

                    <h3 className='font-heading text-xl font-semibold text-foreground'>
                      {meta.label}
                    </h3>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {tier.minLoyaltyPoints === 0
                        ? 'Áp dụng ngay khi đăng ký'
                        : `Từ ${formatNumber(tier.minLoyaltyPoints)} điểm tích lũy`}
                    </p>
                  </div>

                  {/* Perks — chỉ nêu đúng cơ chế BE */}
                  <div className='relative flex flex-1 flex-col gap-5 p-6'>
                    <ul className='flex-1 space-y-3.5 text-sm text-foreground/90'>
                      <li className='flex items-start gap-3'>
                        <span className='mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                          <Check
                            className='size-3'
                            strokeWidth={3}
                          />
                        </span>
                        <span>
                          Tích{' '}
                          <span className='font-semibold text-foreground'>
                            {tier.pointsPer1000Vnd} điểm
                          </span>{' '}
                          / 1.000đ chi tiêu
                        </span>
                      </li>
                      <li className='flex items-start gap-3'>
                        <span className='mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning'>
                          <Sparkles className='size-3' />
                        </span>
                        <span>
                          Giảm{' '}
                          <span className='font-semibold text-foreground'>
                            {tier.discountPercent}%
                          </span>{' '}
                          khi đặt khung giờ vàng
                        </span>
                      </li>
                      <li className='flex items-start gap-3'>
                        <span className='mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                          <CalendarDays className='size-3' />
                        </span>
                        <span>
                          Đặt lịch trước tối đa{' '}
                          <span className='font-semibold text-foreground'>
                            {tier.bookingWindowDays} ngày
                          </span>
                        </span>
                      </li>
                      <li className='flex items-start gap-3 text-muted-foreground'>
                        <span className='mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
                          <Gift className='size-3' />
                        </span>
                        <span>
                          Voucher rửa miễn phí sau mỗi 10 lượt rửa hợp lệ
                        </span>
                      </li>
                    </ul>

                    <Button
                      onClick={() => router.push('/register')}
                      variant={highlight ? 'default' : 'outline'}
                      className='h-10 w-full rounded-full text-sm font-semibold'
                    >
                      Bắt đầu ngay
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className='mt-12 flex justify-center'>
          <p className='inline-flex items-center gap-2.5 text-muted-foreground'>
            <Sparkles className='size-4 text-amber-500' />
            <span>
              Ưu đãi giảm giá được áp dụng trong{' '}
              <span className='font-semibold text-foreground'>
                khung giờ vàng
              </span>
              .
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
