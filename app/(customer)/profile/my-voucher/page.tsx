'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ticket, Calendar, Info, Gift, Percent, Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { useVouchers } from '@/hooks/vouchers/useVouchers';
import { useClaimVoucher } from '@/hooks/vouchers/useClaimVoucher';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Voucher, VoucherStatus } from '@/types/voucher';
import {
  VOUCHER_STATUS_META,
  effectiveVoucherStatus,
  voucherBenefitLabel,
  voucherMinOrderLabel,
  voucherTitle,
} from '@/lib/voucher';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/shared/Pagination';

type FilterKey = 'all' | VoucherStatus;

// `reserved` = voucher đang bị một đơn chưa hoàn tất giữ chỗ; `revoked` = bị
// quản trị thu hồi. BE báo cáo hai trạng thái này TÁCH BIỆT với `expired`.
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unused', label: 'Chưa sử dụng' },
  { key: 'reserved', label: 'Đang giữ' },
  { key: 'used', label: 'Đã sử dụng' },
  { key: 'expired', label: 'Hết hạn' },
  { key: 'revoked', label: 'Đã thu hồi' },
];

/** Màu badge cho từng trạng thái - nhãn lấy từ `VOUCHER_STATUS_META`. */
const STATUS_BADGE_CLASS: Record<VoucherStatus, string> = {
  unused: 'bg-success/10 text-success',
  reserved: 'bg-warning/10 text-warning',
  used: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive',
  revoked: 'bg-destructive/10 text-destructive',
};

function VoucherCard({ v }: { v: Voucher }) {
  const status = effectiveVoucherStatus(v);
  const disabled = status !== 'unused';
  const benefitType = v.campaign?.benefitType;
  const isFreeService =
    benefitType === 'free_service' || (!benefitType && v.type === 'free_wash');
  const minOrder = voucherMinOrderLabel(v);

  return (
    <article
      className={cn(
        'grid overflow-hidden rounded-2xl border bg-card shadow-[0_16px_40px_-34px_rgba(30,58,138,0.6)] transition-all duration-300 sm:grid-cols-[132px_minmax(0,1fr)]',
        disabled
          ? 'border-border/60 opacity-70'
          : 'border-border/70 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(30,58,138,0.65)]',
      )}
    >
      {/* Left colored stub - tô theo màu chiến dịch nếu có. */}
      <div
        className='relative flex min-h-24 items-center justify-between gap-4 bg-linear-to-br from-primary to-[#24429A] p-4 text-white sm:min-h-full sm:flex-col sm:justify-center sm:text-center'
        style={
          v.campaign?.themeColor
            ? { background: v.campaign.themeColor }
            : undefined
        }
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
            {isFreeService ? 'Voucher thưởng' : 'Ưu đãi giảm giá'}
          </span>
        </div>
        <span className='rounded-md bg-white/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide sm:mt-1'>
          {v.code}
        </span>
        <span className='absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-card sm:-right-2 sm:bottom-auto sm:left-auto sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2' />
      </div>

      {/* Right content */}
      <div className='flex min-w-0 flex-col justify-between p-4'>
        <div>
          <div className='flex items-start justify-between gap-2'>
            <h3 className='font-heading font-bold leading-snug text-foreground'>
              <Link
                href={`/profile/my-voucher/${v.id}`}
                className='rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
              >
                {voucherTitle(v)}
              </Link>
            </h3>
            <span
              className={cn(
                'shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider',
                STATUS_BADGE_CLASS[status],
              )}
            >
              {VOUCHER_STATUS_META[status].label}
            </span>
          </div>
          {/* Mức ưu đãi do chiến dịch của voucher quyết định. */}
          <p className='mt-1 text-xs font-semibold text-primary'>
            {voucherBenefitLabel(v)}
          </p>
          {(v.campaign?.description || v.grantedReason) && (
            <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
              {v.campaign?.description || v.grantedReason}
            </p>
          )}
          {minOrder && (
            <p className='text-[11px] text-muted-foreground mt-1'>{minOrder}</p>
          )}
        </div>

        <div className='flex items-end justify-between gap-2 mt-3'>
          <div>
            <p className='text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1'>
              <Calendar className='w-3 h-3' /> Hạn sử dụng
            </p>
            <p className='text-sm font-bold text-foreground'>
              {formatDate(v.expiresAt)}
            </p>
          </div>

          {status === 'unused' ? (
            <Link
              href='/booking'
              className='rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
            >
              Dùng ngay
            </Link>
          ) : (
            <span
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-bold',
                status === 'reserved'
                  ? 'bg-warning/10 text-warning'
                  : status === 'used'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-destructive/10 text-destructive',
              )}
            >
              {VOUCHER_STATUS_META[status].label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ClaimVoucherBox() {
  const [code, setCode] = useState('');
  const claim = useClaimVoucher();

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    claim.mutate(trimmed, {
      onSuccess: (v) => {
        toast.success(`Đã nhận voucher ${v.code}! Xem trong mục "Chưa sử dụng".`);
        setCode('');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <div className='rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:p-5'>
      <label
        htmlFor='claim-code'
        className='text-xs font-medium text-muted-foreground'
      >
        Có mã voucher? Nhập để nhận vào tài khoản
      </label>
      <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
        <input
          id='claim-code'
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder='VD: TET2026-4KP9XM2A7B'
          className='min-w-0 flex-1 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        />
        <button
          type='button'
          onClick={submit}
          disabled={claim.isPending || code.trim() === ''}
          className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        >
          {claim.isPending ? (
            <Spinner className='size-4' />
          ) : (
            <Plus className='w-4 h-4' />
          )}
          Nhận
        </button>
      </div>
    </div>
  );
}

export default function MyVoucherPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const { data: vouchers = [], isLoading, error, refetch } = useVouchers(
    filter === 'all' ? undefined : filter,
  );

  // Phân trang phía client (BE trả toàn bộ voucher của khách).
  const PER_PAGE = 8;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(vouchers.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedVouchers = vouchers.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='font-heading text-2xl font-semibold text-foreground flex items-center gap-2'>
          <Ticket className='w-7 h-7 text-primary' /> Voucher của tôi
        </h1>
        <p className='text-sm text-muted-foreground'>
          Sử dụng các mã giảm giá để tối ưu chi phí chăm sóc xe của bạn.
        </p>
      </div>

      {/* Nhận voucher bằng mã */}
      <ClaimVoucherBox />

      {/* Tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as FilterKey);
          setPage(1);
        }}
      >
        <TabsList className='h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0'>
          {FILTERS.map((f) => (
            <TabsTrigger
              key={f.key}
              value={f.key}
              className='flex-none rounded-none border-b-2 border-transparent px-0 pb-2 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none'
            >
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className='flex flex-col items-center justify-center min-h-[300px] gap-3'>
          <Spinner className='size-8 text-primary' />
          <p className='text-sm text-muted-foreground font-semibold'>
            Đang tải voucher...
          </p>
        </div>
      ) : error ? (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center'>
          <Info className='size-8 text-destructive' />
          <h3 className='mt-3 font-heading text-lg font-bold text-foreground'>Chưa thể tải voucher</h3>
          <p className='mt-1 text-sm text-muted-foreground'>Kết nối đang gặp sự cố. Bạn có thể thử tải lại dữ liệu.</p>
          <button onClick={() => refetch()} className='mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted'>
            <RefreshCcw className='size-4' /> Thử lại
          </button>
        </div>
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title='Chưa có voucher nào'
          description='Bạn chưa có voucher trong mục này. Hãy rửa xe thường xuyên để nhận thêm ưu đãi nhé!'
        />
      ) : (
        <div className='space-y-5'>
          <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
            {pagedVouchers.map((v) => (
              <VoucherCard key={v.id} v={v} />
            ))}
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
