'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Gift,
  Info,
  Percent,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/shared/Pagination';
import { ClaimVoucherBox } from '@/components/voucher/ClaimVoucherBox';
import { useVoucherCampaigns } from '@/hooks/vouchers/useVoucherCampaigns';
import {
  getClaimErrorMessage,
  useClaimCampaign,
} from '@/hooks/vouchers/useClaimCampaign';
import {
  CAMPAIGN_CLAIM_LABEL,
  campaignBenefitLabel,
  campaignClaimState,
  campaignHasRestrictions,
  campaignMinOrderLabel,
  campaignStatusMeta,
  campaignWindowLabel,
} from '@/lib/voucher';
import { cn } from '@/lib/utils';
import type {
  VoucherCampaignPublic,
  VoucherCampaignPublicStatus,
} from '@/types/voucher';

const PER_PAGE = 12;

// Đúng bốn trạng thái BE cho khách xem (`BROWSABLE_CAMPAIGN_STATUSES`).
// `draft` không có ở đây vì BE trả 400 — chương trình chưa công bố phải kín.
const TABS: { key: VoucherCampaignPublicStatus; label: string }[] = [
  { key: 'active', label: 'Đang diễn ra' },
  { key: 'scheduled', label: 'Sắp diễn ra' },
  { key: 'paused', label: 'Tạm dừng' },
  { key: 'ended', label: 'Đã kết thúc' },
];

const EMPTY_COPY: Record<
  VoucherCampaignPublicStatus,
  { title: string; description: string }
> = {
  active: {
    title: 'Chưa có ưu đãi nào đang chạy',
    description:
      'Hiện cửa hàng chưa mở chương trình nào. Bạn vẫn tích lượt rửa để nhận voucher thưởng theo hạng thành viên nhé!',
  },
  scheduled: {
    title: 'Chưa có ưu đãi nào được lên lịch',
    description: 'Khi cửa hàng hẹn ngày mở chương trình mới, nó sẽ hiện ở đây.',
  },
  paused: {
    title: 'Không có ưu đãi nào đang tạm dừng',
    description: 'Chương trình bị tạm dừng sẽ xuất hiện ở mục này.',
  },
  ended: {
    title: 'Chưa có ưu đãi nào kết thúc',
    description: 'Các chương trình đã khép lại sẽ được lưu ở đây để bạn xem lại.',
  },
};

function CampaignCard({
  c,
  onClaim,
  claiming,
}: {
  c: VoucherCampaignPublic;
  onClaim: () => void;
  claiming: boolean;
}) {
  const meta = campaignStatusMeta(c.status);
  const isFreeService = c.benefitType === 'free_service';
  const minOrder = campaignMinOrderLabel(c);
  const windowLabel = campaignWindowLabel(c);
  // BE trả sẵn alreadyClaimed/soldOut/remaining nên biết trước có nhận được
  // hay không, khỏi để khách bấm rồi mới ăn 409.
  const claimState = campaignClaimState(c);

  return (
    <article
      className={cn(
        'grid overflow-hidden rounded-2xl border bg-card shadow-[0_16px_40px_-34px_rgba(30,58,138,0.6)] transition-all duration-300 sm:grid-cols-[132px_minmax(0,1fr)]',
        meta.claimable
          ? 'border-border/70 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(30,58,138,0.65)]'
          : 'border-border/60 opacity-80',
      )}
    >
      {/* Cuống thẻ tô theo màu chiến dịch, giống thẻ voucher trong ví. */}
      <div
        className='relative flex min-h-24 items-center justify-between gap-4 bg-linear-to-br from-primary to-[#24429A] p-4 text-white sm:min-h-full sm:flex-col sm:justify-center sm:text-center'
        style={c.themeColor ? { background: c.themeColor } : undefined}
      >
        <div className='flex items-center gap-3 sm:flex-col sm:gap-0'>
          {isFreeService ? (
            <Gift className='size-8 sm:my-1 sm:size-9' />
          ) : (
            <span className='flex text-2xl font-semibold leading-none sm:my-1'>
              <Percent className='size-6' />
            </span>
          )}
          <span className='text-[10px] font-semibold uppercase tracking-widest text-white/75'>
            {isFreeService ? 'Miễn phí dịch vụ' : 'Ưu đãi giảm giá'}
          </span>
        </div>
        <span className='absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-card sm:-right-2 sm:bottom-auto sm:left-auto sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2' />
      </div>

      <div className='flex min-w-0 flex-col justify-between p-4'>
        <div>
          <div className='flex items-start justify-between gap-2'>
            <h3 className='font-heading font-bold leading-snug text-foreground'>
              <Link
                href={`/profile/promotions/${c.id}`}
                className='rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
              >
                {c.title}
              </Link>
            </h3>
            <span
              className={cn(
                'shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider',
                meta.badgeClass,
              )}
            >
              {meta.label}
            </span>
          </div>

          <p className='mt-1 text-xs font-semibold text-primary'>
            {campaignBenefitLabel(c)}
          </p>
          {c.description && (
            <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
              {c.description}
            </p>
          )}
          {minOrder && (
            <p className='mt-1 text-[11px] text-muted-foreground'>{minOrder}</p>
          )}
          {campaignHasRestrictions(c) && (
            <p className='mt-1 flex items-center gap-1 text-[11px] text-muted-foreground'>
              <ShieldAlert className='size-3 shrink-0' />
              Có điều kiện áp dụng — xem chi tiết
            </p>
          )}
        </div>

        <div className='mt-3 flex items-end justify-between gap-2'>
          <div>
            <p className='flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground'>
              <Calendar className='w-3 h-3' /> Thời gian
            </p>
            <p className='text-sm font-bold text-foreground'>
              {windowLabel || '-'}
            </p>
            {/* Tồn kho pool - không phải ngân sách hay maxUsesTotal. */}
            {typeof c.remaining === 'number' && c.remaining > 0 && (
              <p className='mt-0.5 text-[11px] font-semibold text-primary'>
                Còn {c.remaining.toLocaleString('vi-VN')} lượt
              </p>
            )}
          </div>

          {claimState === 'claimable' ? (
            <button
              type='button'
              onClick={onClaim}
              disabled={claiming}
              aria-busy={claiming}
              className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
            >
              {claiming && <Spinner className='size-3.5' />}
              {claiming ? 'Đang nhận...' : 'Nhận ưu đãi'}
            </button>
          ) : claimState === 'claimed' ? (
            <span className='rounded-lg bg-success/10 px-3 py-2 text-xs font-bold text-success'>
              {CAMPAIGN_CLAIM_LABEL.claimed}
            </span>
          ) : claimState === 'sold_out' ? (
            <span className='rounded-lg bg-muted px-3 py-2 text-xs font-bold text-muted-foreground'>
              {CAMPAIGN_CLAIM_LABEL.sold_out}
            </span>
          ) : (
            <span
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-bold',
                meta.badgeClass,
              )}
            >
              {meta.label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PromotionsPage() {
  const [status, setStatus] = useState<VoucherCampaignPublicStatus>('active');
  const [page, setPage] = useState(1);
  const claimInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error, refetch, isFetching } = useVoucherCampaigns({
    status,
    page,
    limit: PER_PAGE,
  });
  const campaigns = data?.data ?? [];
  const meta = data?.meta;

  const claim = useClaimCampaign();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  /**
   * Nhận thẳng một voucher của chiến dịch — không cần khách biết mã.
   * Ô nhập mã bên trên vẫn giữ, dành cho mã cửa hàng gửi riêng qua tin nhắn.
   */
  const handleClaim = (campaign: VoucherCampaignPublic) => {
    setClaimingId(campaign.id);
    claim.mutate(campaign.id, {
      onSuccess: (voucher) => {
        toast.success(
          `Đã nhận ${voucher.code}! Xem trong mục "Voucher của tôi".`,
        );
      },
      // 403 hạng không đủ · 404 chưa công bố · 409 hết lượt/ngân sách/đã nhận ·
      // 429 bấm quá nhanh. BE nói rõ lý do nên hiển thị đúng nguyên nhân.
      onError: (error) => toast.error(getClaimErrorMessage(error)),
      onSettled: () => setClaimingId(null),
    });
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 font-heading text-2xl font-semibold text-foreground'>
            <Sparkles className='w-7 h-7 text-primary' /> Ưu đãi đang có
          </h1>
          <p className='text-sm text-muted-foreground'>
            Các chương trình khuyến mãi của cửa hàng và điều kiện áp dụng.
          </p>
        </div>
        <Link
          href='/profile/my-voucher'
          className='inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        >
          <Ticket className='size-4 text-primary' /> Voucher của tôi
        </Link>
      </div>

      <ClaimVoucherBox
        id='promotion-claim-code'
        inputRef={claimInputRef}
        label='Có mã của chương trình? Nhập để nhận voucher vào tài khoản'
        hint='Mã do cửa hàng gửi cho bạn (tin nhắn, email hoặc tại quầy). Voucher nhận được sẽ nằm ở mục "Voucher của tôi".'
      />

      {/* Tabs trạng thái */}
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as VoucherCampaignPublicStatus);
          setPage(1);
        }}
      >
        <TabsList className='h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0'>
          {TABS.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className='flex-none rounded-none border-b-2 border-transparent px-0 pb-2 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none'
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className='flex min-h-[300px] flex-col items-center justify-center gap-3'>
          <Spinner className='size-8 text-primary' />
          <p className='text-sm font-semibold text-muted-foreground'>
            Đang tải ưu đãi...
          </p>
        </div>
      ) : error ? (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center'>
          <Info className='size-8 text-destructive' />
          <h3 className='mt-3 font-heading text-lg font-bold text-foreground'>
            Chưa thể tải ưu đãi
          </h3>
          <p className='mt-1 text-sm text-muted-foreground'>
            Kết nối đang gặp sự cố. Bạn có thể thử tải lại dữ liệu.
          </p>
          <button
            onClick={() => refetch()}
            className='mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted'
          >
            <RefreshCcw className={cn('size-4', isFetching && 'animate-spin')} />{' '}
            Thử lại
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={EMPTY_COPY[status].title}
          description={EMPTY_COPY[status].description}
        />
      ) : (
        <div className='space-y-5'>
          <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                c={c}
                onClaim={() => handleClaim(c)}
                claiming={claimingId === c.id}
              />
            ))}
          </div>
          <Pagination
            page={meta?.page ?? page}
            totalPages={meta?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
