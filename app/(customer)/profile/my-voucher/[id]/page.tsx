'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Calendar,
  Info,
  Gift,
  Percent,
  ArrowLeft,
  Hash,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useVoucher } from '@/hooks/vouchers/useVoucher';
import { VoucherStatus } from '@/types/voucher';
import {
  effectiveVoucherStatus,
  voucherBenefitLabel,
  voucherMinOrderLabel,
  voucherTitle,
} from '@/lib/voucher';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * `reserved` = voucher đang bị một đơn chưa hoàn tất giữ chỗ (không phải "đã dùng").
 * `revoked` = quản trị thu hồi sớm, BE cố ý KHÔNG báo cáo là `expired`.
 */
const STATUS_META: Record<
  VoucherStatus,
  { label: string; className: string }
> = {
  unused: { label: 'Chưa sử dụng', className: 'bg-green-100 text-green-700' },
  reserved: { label: 'Đang giữ cho đơn', className: 'bg-warning/15 text-warning' },
  used: { label: 'Đã sử dụng', className: 'bg-muted text-muted-foreground' },
  expired: { label: 'Hết hạn', className: 'bg-red-100 text-destructive' },
  revoked: { label: 'Đã thu hồi', className: 'bg-red-100 text-destructive' },
};

export default function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: voucher, isLoading, error } = useVoucher(id);

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] gap-3'>
        <Spinner className='size-8 text-primary' />
        <p className='text-sm text-muted-foreground font-semibold'>
          Đang tải voucher...
        </p>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className='space-y-4'>
        <button
          onClick={() => router.push('/profile/my-voucher')}
          className='inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary'
        >
          <ArrowLeft className='w-4 h-4' /> Quay lại
        </button>
        <div className='bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center text-destructive space-y-2'>
          <Info className='w-8 h-8 mx-auto' />
          <h3 className='font-heading font-bold text-lg'>
            Không tìm thấy voucher
          </h3>
          <p className='text-sm'>
            Voucher không tồn tại hoặc đã bị gỡ. Vui lòng thử lại.
          </p>
        </div>
      </div>
    );
  }

  const status = effectiveVoucherStatus(voucher);
  const statusMeta = STATUS_META[status];
  const campaign = voucher.campaign;
  const benefitType = campaign?.benefitType;
  const isFreeService =
    benefitType === 'free_service' ||
    (!benefitType && voucher.type === 'free_wash');
  const minOrder = voucherMinOrderLabel(voucher);

  return (
    <div className='space-y-6 animate-fade-in'>
      {/* Back */}
      <button
        onClick={() => router.push('/profile/my-voucher')}
        className='inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách voucher
      </button>

      {/* Voucher hero */}
      <div className='flex flex-col sm:flex-row rounded-xl overflow-hidden border border-border/60 bg-card shadow-xs'>
        <div
          className='relative sm:w-48 shrink-0 bg-gradient-to-br from-primary to-blue-700 text-white flex flex-col items-center justify-center p-6 text-center'
          style={
            campaign?.themeColor
              ? { background: campaign.themeColor }
              : undefined
          }
        >
          <span className='text-[11px] font-semibold uppercase tracking-widest text-white/70'>
            {isFreeService ? 'Tặng' : 'Giảm'}
          </span>
          {isFreeService ? (
            <Gift className='w-12 h-12 my-2' />
          ) : (
            <Percent className='w-10 h-10 my-2' />
          )}
          <span className='text-xs font-bold uppercase tracking-wide bg-white/15 rounded-full px-3 py-1 mt-1'>
            {voucher.code}
          </span>
        </div>

        <div className='flex-1 p-6 space-y-3'>
          <div className='flex items-start justify-between gap-3'>
            <h1 className='font-heading text-xl font-semibold text-foreground'>
              {voucherTitle(voucher)}
            </h1>
            <span
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider',
                statusMeta.className,
              )}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className='text-sm text-muted-foreground'>
            {campaign?.description ||
              voucher.grantedReason ||
              voucherBenefitLabel(voucher)}
          </p>
          {minOrder && (
            <p className='text-xs font-semibold text-foreground/70'>
              {minOrder}
            </p>
          )}

          {status === 'unused' && (
            <button
              onClick={() => router.push('/booking')}
              className='rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary/90'
            >
              Dùng ngay
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className='rounded-xl border border-border/60 bg-card shadow-xs divide-y divide-border/50'>
        <DetailRow
          icon={Ticket}
          label='Loại voucher'
          value={voucherTitle(voucher)}
        />
        <DetailRow
          icon={Percent}
          label='Ưu đãi'
          value={voucherBenefitLabel(voucher)}
        />
        {minOrder && (
          <DetailRow icon={Ticket} label='Điều kiện' value={minOrder} />
        )}
        <DetailRow
          icon={Calendar}
          label='Hạn sử dụng'
          value={formatDate(voucher.expiresAt)}
        />
        <DetailRow icon={Hash} label='Mã voucher' value={voucher.code} />
        {/* Voucher đang bị một đơn chưa hoàn tất giữ chỗ. */}
        {voucher.status === 'reserved' && voucher.reservedUntil && (
          <DetailRow
            icon={Calendar}
            label='Đang giữ đến'
            value={formatDateTime(voucher.reservedUntil)}
          />
        )}
        {voucher.usedAt && (
          <DetailRow
            icon={CheckCircle2}
            label='Đã sử dụng lúc'
            value={formatDateTime(voucher.usedAt)}
          />
        )}
        {voucher.revokedAt && (
          <DetailRow
            icon={ClipboardList}
            label='Bị thu hồi lúc'
            value={formatDateTime(voucher.revokedAt)}
          />
        )}
        {voucher.revokeReason && (
          <DetailRow
            icon={ClipboardList}
            label='Lý do thu hồi'
            value={voucher.revokeReason}
          />
        )}
        {voucher.grantedReason && (
          <DetailRow
            icon={ClipboardList}
            label='Lý do nhận'
            value={voucher.grantedReason}
          />
        )}
      </div>

      {/* Điều khoản của chiến dịch. */}
      {campaign?.terms && (
        <div className='rounded-xl border border-border/60 bg-card p-5 shadow-xs'>
          <h2 className='font-heading text-sm font-bold text-foreground'>
            Điều khoản áp dụng
          </h2>
          <p className='mt-2 text-sm whitespace-pre-line text-muted-foreground'>
            {campaign.terms}
          </p>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <div className='flex items-center gap-3 px-5 py-4'>
      <div className='p-2 rounded-lg bg-primary/5 text-primary'>
        <Icon className='w-4 h-4' />
      </div>
      <span className='text-sm text-muted-foreground flex-1'>{label}</span>
      <span className='text-sm font-bold text-foreground text-right'>
        {value}
      </span>
    </div>
  );
}
