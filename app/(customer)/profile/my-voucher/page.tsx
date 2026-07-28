'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Calendar, Info, Gift, Percent, Plus } from 'lucide-react';
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

function VoucherCard({ v }: { v: Voucher }) {
  const router = useRouter();
  const status = effectiveVoucherStatus(v);
  const disabled = status !== 'unused';
  const benefitType = v.campaign?.benefitType;
  const isFreeService =
    benefitType === 'free_service' || (!benefitType && v.type === 'free_wash');
  const minOrder = voucherMinOrderLabel(v);

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => router.push(`/profile/my-voucher/${v.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/profile/my-voucher/${v.id}`);
        }
      }}
      className={cn(
        'flex rounded-xl overflow-hidden border bg-card shadow-xs transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        disabled
          ? 'border-border/60 opacity-70'
          : 'border-border/60 hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      {/* Left colored stub - tô theo màu chiến dịch nếu có. */}
      <div
        className='relative w-32 shrink-0 bg-gradient-to-br from-primary to-blue-700 text-white flex flex-col items-center justify-center p-4 text-center'
        style={
          v.campaign?.themeColor
            ? { background: v.campaign.themeColor }
            : undefined
        }
      >
        <span className='text-[10px] font-semibold uppercase tracking-widest text-white/70'>
          {isFreeService ? 'Tặng' : 'Giảm'}
        </span>
        {isFreeService ? (
          <Gift className='w-9 h-9 my-1' />
        ) : (
          <span className='text-2xl font-semibold leading-none my-1 flex items-center'>
            <Percent className='w-5 h-5' />
          </span>
        )}
        <span className='text-[10px] font-bold uppercase tracking-wide bg-white/15 rounded-full px-2 py-0.5 mt-1'>
          {v.code}
        </span>
        {/* notch decorations */}
        <span className='absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#F5F5F5]' />
      </div>

      {/* Right content */}
      <div className='flex-1 p-4 flex flex-col justify-between min-w-0'>
        <div>
          <div className='flex items-start justify-between gap-2'>
            <h3 className='font-heading font-bold text-foreground leading-snug'>
              {voucherTitle(v)}
            </h3>
            <span className='shrink-0 text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-md px-1.5 py-0.5'>
              {voucherBenefitLabel(v)}
            </span>
          </div>
          <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
            {v.campaign?.description || v.grantedReason || voucherBenefitLabel(v)}
          </p>
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push('/booking');
              }}
              className='rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary/90'
            >
              Dùng ngay
            </button>
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
    </div>
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
    <div className='rounded-xl border border-border bg-muted/40 p-4'>
      <label
        htmlFor='claim-code'
        className='text-xs font-medium text-muted-foreground'
      >
        Có mã voucher? Nhập để nhận vào tài khoản
      </label>
      <div className='mt-2 flex gap-2'>
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
          className='inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
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
  const { data: vouchers = [], isLoading, error } = useVouchers(
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
    <div className='space-y-6 animate-fade-in'>
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
        <TabsList className='bg-transparent border-b border-border/60 rounded-none p-0 h-auto w-full justify-start gap-6'>
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
        <div className='bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center text-destructive space-y-2'>
          <Info className='w-8 h-8 mx-auto' />
          <h3 className='font-heading font-bold text-lg'>Đã xảy ra lỗi</h3>
          <p className='text-sm'>
            Không thể tải danh sách voucher. Vui lòng thử lại sau.
          </p>
        </div>
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title='Chưa có voucher nào'
          description='Bạn chưa có voucher trong mục này. Hãy rửa xe thường xuyên để nhận thêm ưu đãi nhé!'
        />
      ) : (
        <div className='space-y-5'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
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
