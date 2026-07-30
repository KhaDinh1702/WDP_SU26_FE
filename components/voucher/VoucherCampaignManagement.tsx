'use client';

import {
  adminActivateVoucherCampaign,
  adminCreateVoucherCampaign,
  adminEndVoucherCampaign,
  adminGetVoucherCampaigns,
  adminGetVoucherCampaignStats,
  adminPauseVoucherCampaign,
  adminUpdateVoucherCampaign,
} from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { formatCurrency, formatDate } from '@/lib/format';
import type {
  CreateVoucherCampaignDto,
  VoucherBenefitType,
  VoucherCampaign,
  VoucherCampaignStatus,
  VoucherStackingPolicy,
} from '@/types/voucher';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CircleStop,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const STATUS_META: Record<
  VoucherCampaignStatus,
  { label: string; cls: string }
> = {
  draft: {
    label: 'Nháp',
    cls: 'bg-muted text-muted-foreground border border-border',
  },
  scheduled: {
    label: 'Đã lên lịch',
    cls: 'bg-primary/10 text-primary border border-primary/30',
  },
  active: {
    label: 'Đang chạy',
    cls: 'bg-success/10 text-success border border-success/30',
  },
  paused: {
    label: 'Tạm dừng',
    cls: 'bg-warning/10 text-warning border border-warning/30',
  },
  ended: {
    label: 'Đã kết thúc',
    cls: 'bg-muted text-muted-foreground border border-border',
  },
};

const STATUS_TABS: { value: 'all' | VoucherCampaignStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'active', label: 'Đang chạy' },
  { value: 'paused', label: 'Tạm dừng' },
  { value: 'ended', label: 'Đã kết thúc' },
];

const BENEFIT_OPTIONS: { value: VoucherBenefitType; label: string }[] = [
  { value: 'fixed_amount', label: 'Giảm số tiền cố định' },
  { value: 'percent_off', label: 'Giảm theo phần trăm' },
  { value: 'free_service', label: 'Miễn phí dịch vụ' },
];

const STACKING_OPTIONS: { value: VoucherStackingPolicy; label: string }[] = [
  { value: 'with_tier_and_promotion', label: 'Cộng dồn hạng + giờ vàng' },
  { value: 'with_tier', label: 'Chỉ cộng dồn với hạng thành viên' },
  { value: 'with_promotion', label: 'Chỉ cộng dồn với giờ vàng' },
  { value: 'none', label: 'Không cộng dồn' },
];

/** `datetime-local` cần `YYYY-MM-DDTHH:mm` theo giờ máy, không phải ISO UTC. */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const benefitSummary = (c: VoucherCampaign): string => {
  switch (c.benefitType) {
    case 'percent_off':
      return c.discountCapVnd
        ? `Giảm ${c.discountValue ?? 0}% (tối đa ${formatCurrency(c.discountCapVnd)})`
        : `Giảm ${c.discountValue ?? 0}%`;
    case 'fixed_amount':
      return `Giảm ${formatCurrency(c.discountValue ?? 0)}`;
    case 'free_service':
      return 'Miễn phí dịch vụ';
    default:
      return '-';
  }
};

// ─────────────────── Modal tạo / sửa chiến dịch ───────────────────

type CampaignFormState = {
  name: string;
  title: string;
  description: string;
  terms: string;
  themeColor: string;
  benefitType: VoucherBenefitType;
  discountValue: string;
  discountCapVnd: string;
  minOrderVnd: string;
  validFrom: string;
  validUntil: string;
  stackingPolicy: VoucherStackingPolicy;
  maxUsesTotal: string;
  maxUsesPerCustomer: string;
  budgetVnd: string;
  publicClaimCode: string;
};

function emptyForm(): CampaignFormState {
  return {
    name: '',
    title: '',
    description: '',
    terms: '',
    themeColor: '',
    benefitType: 'fixed_amount',
    discountValue: '',
    discountCapVnd: '',
    minOrderVnd: '',
    validFrom: '',
    validUntil: '',
    stackingPolicy: 'with_tier_and_promotion',
    maxUsesTotal: '',
    maxUsesPerCustomer: '1',
    budgetVnd: '',
    publicClaimCode: '',
  };
}

function formFrom(c: VoucherCampaign): CampaignFormState {
  return {
    name: c.name ?? '',
    title: c.title ?? '',
    description: c.description ?? '',
    terms: c.terms ?? '',
    themeColor: c.themeColor ?? '',
    benefitType: c.benefitType ?? 'fixed_amount',
    discountValue: c.discountValue != null ? String(c.discountValue) : '',
    discountCapVnd: c.discountCapVnd != null ? String(c.discountCapVnd) : '',
    minOrderVnd: c.minOrderVnd != null ? String(c.minOrderVnd) : '',
    validFrom: toLocalInput(c.validFrom),
    validUntil: toLocalInput(c.validUntil),
    stackingPolicy: c.stackingPolicy ?? 'with_tier_and_promotion',
    maxUsesTotal: c.maxUsesTotal != null ? String(c.maxUsesTotal) : '',
    maxUsesPerCustomer:
      c.maxUsesPerCustomer != null ? String(c.maxUsesPerCustomer) : '1',
    budgetVnd: c.budgetVnd != null ? String(c.budgetVnd) : '',
    publicClaimCode: c.publicClaimCode ?? '',
  };
}

const num = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Kiểm tra chéo TRƯỚC khi gửi, đúng luật BE nêu ở POST /admin/voucher-campaigns:
 * validFrom < validUntil, percent_off cần discountValue 1-100, free_service cần
 * applicableServiceTypeIds khác rỗng, discountCapVnd chỉ hợp lệ với percent_off.
 */
function validate(f: CampaignFormState): string | null {
  if (f.name.trim().length < 3) return 'Tên nội bộ cần ít nhất 3 ký tự.';
  if (f.title.trim().length < 3) return 'Tiêu đề cần ít nhất 3 ký tự.';
  if (!f.validFrom || !f.validUntil)
    return 'Cần chọn cả thời điểm bắt đầu và kết thúc.';
  if (new Date(f.validFrom).getTime() >= new Date(f.validUntil).getTime())
    return 'Thời điểm bắt đầu phải trước thời điểm kết thúc.';

  if (f.benefitType === 'percent_off') {
    const v = num(f.discountValue);
    if (v == null || v < 1 || v > 100)
      return 'Giảm theo phần trăm cần giá trị từ 1 đến 100.';
  }
  if (f.benefitType === 'fixed_amount') {
    const v = num(f.discountValue);
    if (v == null || v < 1) return 'Cần nhập số tiền giảm.';
  }
  if (f.benefitType !== 'percent_off' && f.discountCapVnd.trim() !== '')
    return 'Trần giảm chỉ áp dụng cho loại giảm theo phần trăm.';
  if (f.benefitType === 'free_service')
    return 'Miễn phí dịch vụ cần chọn dịch vụ áp dụng — BE bắt buộc applicableServiceTypeIds, hiện form chưa hỗ trợ. Hãy chọn loại ưu đãi khác.';

  if (
    f.publicClaimCode.trim() !== '' &&
    !/^[A-Z0-9]{3,20}$/.test(f.publicClaimCode.trim())
  )
    return 'Mã nhận chung chỉ gồm 3-20 ký tự A-Z hoặc 0-9.';

  return null;
}

function CampaignModal({
  editing,
  onClose,
  onSubmit,
  submitting,
}: {
  editing: VoucherCampaign | null;
  onClose: () => void;
  onSubmit: (payload: CreateVoucherCampaignDto) => void;
  submitting: boolean;
}) {
  const [f, setF] = useState<CampaignFormState>(() =>
    editing ? formFrom(editing) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof CampaignFormState>(
    k: K,
    v: CampaignFormState[K],
  ) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = () => {
    const problem = validate(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    onSubmit({
      name: f.name.trim(),
      title: f.title.trim(),
      benefitType: f.benefitType,
      validFrom: new Date(f.validFrom).toISOString(),
      validUntil: new Date(f.validUntil).toISOString(),
      stackingPolicy: f.stackingPolicy,
      ...(f.description.trim() ? { description: f.description.trim() } : {}),
      ...(f.terms.trim() ? { terms: f.terms.trim() } : {}),
      ...(f.themeColor.trim() ? { themeColor: f.themeColor.trim() } : {}),
      ...(num(f.discountValue) != null
        ? { discountValue: num(f.discountValue) }
        : {}),
      ...(num(f.discountCapVnd) != null
        ? { discountCapVnd: num(f.discountCapVnd) }
        : {}),
      ...(num(f.minOrderVnd) != null
        ? { minOrderVnd: num(f.minOrderVnd) }
        : {}),
      ...(num(f.maxUsesTotal) != null
        ? { maxUsesTotal: num(f.maxUsesTotal) }
        : {}),
      ...(num(f.maxUsesPerCustomer) != null
        ? { maxUsesPerCustomer: num(f.maxUsesPerCustomer) }
        : {}),
      ...(num(f.budgetVnd) != null ? { budgetVnd: num(f.budgetVnd) } : {}),
      ...(f.publicClaimCode.trim()
        ? { publicClaimCode: f.publicClaimCode.trim().toUpperCase() }
        : {}),
    });
  };

  const input =
    'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const label = 'mb-1.5 block text-xs font-medium text-muted-foreground';

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-7 shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-5 flex items-center justify-between'>
          <h3 className='flex items-center gap-2 font-heading text-lg font-semibold text-foreground'>
            <Sparkles className='size-5 text-primary' />
            {editing ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}
          </h3>
          <button onClick={onClose} aria-label='Đóng'>
            <X className='size-5 text-foreground/40' />
          </button>
        </div>

        {editing && (
          <p className='mb-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
            Trạng thái không sửa ở đây — dùng nút Kích hoạt / Tạm dừng / Kết
            thúc. Chiến dịch đã kết thúc là bất biến.
          </p>
        )}

        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <label className={label}>
              Tên nội bộ <span className='text-destructive'>*</span>
            </label>
            <input
              value={f.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder='tet-2026-winback'
              className={input}
            />
          </div>
          <div>
            <label className={label}>
              Tiêu đề hiển thị cho khách{' '}
              <span className='text-destructive'>*</span>
            </label>
            <input
              value={f.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder='Giảm 50K mừng Tết 2026'
              className={input}
            />
          </div>

          <div className='sm:col-span-2'>
            <label className={label}>Mô tả ngắn</label>
            <textarea
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className={`${input} resize-none`}
            />
          </div>

          <div>
            <label className={label}>Loại ưu đãi</label>
            <select
              value={f.benefitType}
              onChange={(e) =>
                set('benefitType', e.target.value as VoucherBenefitType)
              }
              className={input}
            >
              {BENEFIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>
              {f.benefitType === 'percent_off'
                ? 'Phần trăm giảm (1-100)'
                : 'Số tiền giảm (VND)'}
            </label>
            <input
              type='number'
              value={f.discountValue}
              onChange={(e) => set('discountValue', e.target.value)}
              disabled={f.benefitType === 'free_service'}
              className={input}
            />
          </div>

          <div>
            <label className={label}>
              Trần giảm (VND){' '}
              <span className='text-placeholder'>— chỉ cho %</span>
            </label>
            <input
              type='number'
              value={f.discountCapVnd}
              onChange={(e) => set('discountCapVnd', e.target.value)}
              disabled={f.benefitType !== 'percent_off'}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Đơn tối thiểu (VND)</label>
            <input
              type='number'
              value={f.minOrderVnd}
              onChange={(e) => set('minOrderVnd', e.target.value)}
              className={input}
            />
          </div>

          <div>
            <label className={label}>
              Bắt đầu <span className='text-destructive'>*</span>
            </label>
            <input
              type='datetime-local'
              value={f.validFrom}
              onChange={(e) => set('validFrom', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>
              Kết thúc <span className='text-destructive'>*</span>
            </label>
            <input
              type='datetime-local'
              value={f.validUntil}
              onChange={(e) => set('validUntil', e.target.value)}
              className={input}
            />
          </div>

          <div>
            <label className={label}>Chính sách cộng dồn</label>
            <select
              value={f.stackingPolicy}
              onChange={(e) =>
                set('stackingPolicy', e.target.value as VoucherStackingPolicy)
              }
              className={input}
            >
              {STACKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>
              Mã nhận chung{' '}
              <span className='text-placeholder'>(bỏ trống = không có)</span>
            </label>
            <input
              value={f.publicClaimCode}
              onChange={(e) =>
                set('publicClaimCode', e.target.value.toUpperCase())
              }
              placeholder='TET2026'
              className={`${input} font-mono uppercase`}
            />
          </div>

          <div>
            <label className={label}>
              Tổng lượt tối đa{' '}
              <span className='text-placeholder'>(trống = không giới hạn)</span>
            </label>
            <input
              type='number'
              value={f.maxUsesTotal}
              onChange={(e) => set('maxUsesTotal', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Số lượt mỗi khách</label>
            <input
              type='number'
              value={f.maxUsesPerCustomer}
              onChange={(e) => set('maxUsesPerCustomer', e.target.value)}
              className={input}
            />
          </div>

          <div>
            <label className={label}>
              Ngân sách (VND){' '}
              <span className='text-placeholder'>(trống = không giới hạn)</span>
            </label>
            <input
              type='number'
              value={f.budgetVnd}
              onChange={(e) => set('budgetVnd', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Màu thẻ (hex)</label>
            <input
              value={f.themeColor}
              onChange={(e) => set('themeColor', e.target.value)}
              placeholder='#E4572E'
              className={`${input} font-mono`}
            />
          </div>

          <div className='sm:col-span-2'>
            <label className={label}>Điều khoản áp dụng</label>
            <textarea
              value={f.terms}
              onChange={(e) => set('terms', e.target.value)}
              rows={3}
              className={`${input} resize-none`}
            />
          </div>
        </div>

        {error && (
          <p className='mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive'>
            <AlertCircle className='mt-px size-4 shrink-0' /> {error}
          </p>
        )}

        <div className='mt-6 flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold hover:bg-muted'
          >
            Huỷ
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className='flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          >
            {submitting
              ? 'Đang lưu…'
              : editing
                ? 'Lưu thay đổi'
                : 'Tạo chiến dịch (nháp)'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Modal thống kê ───────────────────────

function StatsModal({
  campaign,
  onClose,
}: {
  campaign: VoucherCampaign;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-campaign-stats', campaign.id],
    queryFn: async () => (await adminGetVoucherCampaignStats(campaign.id)).data,
  });

  const rows: { label: string; value: string }[] = data
    ? [
        { label: 'Đã phát hành', value: String(data.issued) },
        { label: 'Khách đã nhận', value: String(data.claimed) },
        { label: 'Còn trong kho', value: String(data.inPool) },
        { label: 'Đang giữ cho đơn', value: String(data.reserved) },
        { label: 'Đã dùng', value: String(data.used) },
        { label: 'Hết hạn không dùng', value: String(data.expired) },
        { label: 'Bị thu hồi', value: String(data.revoked) },
        {
          label: 'Tỷ lệ sử dụng',
          value: `${data.redemptionRatePercent}%`,
        },
        {
          label: 'Tổng tiền đã giảm',
          value: formatCurrency(data.totalDiscountVnd),
        },
        {
          label: 'Ngân sách còn lại',
          value:
            data.budgetVnd == null
              ? 'Không giới hạn'
              : formatCurrency(data.budgetRemainingVnd),
        },
        {
          label: 'Giá trị đơn TB trước giảm',
          value: formatCurrency(data.averageOrderBeforeDiscountVnd),
        },
        {
          label: 'Giá trị đơn TB sau giảm',
          value: formatCurrency(data.averageOrderAfterDiscountVnd),
        },
      ]
    : [];

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-7 shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-1 flex items-center justify-between'>
          <h3 className='flex items-center gap-2 font-heading text-lg font-semibold text-foreground'>
            <BarChart3 className='size-5 text-primary' /> Hiệu quả chiến dịch
          </h3>
          <button onClick={onClose} aria-label='Đóng'>
            <X className='size-5 text-foreground/40' />
          </button>
        </div>
        <p className='mb-5 text-sm text-muted-foreground'>{campaign.title}</p>

        {isLoading ? (
          <div className='space-y-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='h-8 animate-pulse rounded bg-muted' />
            ))}
          </div>
        ) : (
          <>
            <dl className='divide-y divide-border rounded-lg border border-border'>
              {rows.map((r) => (
                <div
                  key={r.label}
                  className='flex items-center justify-between px-4 py-2.5'
                >
                  <dt className='text-sm text-muted-foreground'>{r.label}</dt>
                  <dd className='text-sm font-semibold tabular-nums text-foreground'>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* BE tự báo khi bộ đếm cache lệch so với dữ liệu gốc. */}
            {data && !data.countersInSync && (
              <p className='mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning'>
                <AlertCircle className='mt-px size-4 shrink-0' />
                Bộ đếm đang lệch với dữ liệu gốc. Cần chạy job
                <span className='font-mono'>campaign-reconcile</span>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Main ───────────────────────────

export function VoucherCampaignManagement() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | VoucherCampaignStatus>(
    'all',
  );
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VoucherCampaign | null>(null);
  const [statsFor, setStatsFor] = useState<VoucherCampaign | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-voucher-campaigns', statusFilter, page],
    queryFn: async () => {
      const res = await adminGetVoucherCampaigns({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      return res.data;
    },
  });

  const campaigns = data?.data ?? [];
  const meta = data?.meta;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-voucher-campaigns'] });
    // Trang ưu đãi của khách đọc cùng nguồn dữ liệu.
    qc.invalidateQueries({ queryKey: ['voucher-campaigns'] });
  };

  const save = useMutation({
    mutationFn: (payload: CreateVoucherCampaignDto) =>
      editing
        ? adminUpdateVoucherCampaign(editing.id, payload)
        : adminCreateVoucherCampaign(payload),
    onSuccess: () => {
      toast.success(
        editing
          ? 'Đã lưu chiến dịch.'
          : 'Đã tạo chiến dịch ở trạng thái nháp. Bấm Kích hoạt để chạy.',
      );
      invalidate();
      setModalOpen(false);
      setEditing(null);
    },
    // 409 = trùng `name` hoặc `publicClaimCode`, hoặc chiến dịch đã kết thúc.
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const lifecycle = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'activate' | 'pause' | 'end';
    }) =>
      action === 'activate'
        ? adminActivateVoucherCampaign(id)
        : action === 'pause'
          ? adminPauseVoucherCampaign(id)
          : adminEndVoucherCampaign(id),
    onSuccess: (_res, v) => {
      toast.success(
        v.action === 'activate'
          ? 'Đã kích hoạt chiến dịch.'
          : v.action === 'pause'
            ? 'Đã tạm dừng chiến dịch.'
            : 'Đã kết thúc chiến dịch.',
      );
      invalidate();
    },
    // 409 = chuyển trạng thái không hợp lệ (VD: kích hoạt khi đã quá validUntil).
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <main className='flex-1 overflow-y-auto p-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-1.5 rounded-xl border border-border bg-card p-1'>
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setStatusFilter(t.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  statusFilter === t.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/60 hover:bg-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => refetch()}
              title='Tải lại'
              className='rounded-xl border border-border bg-card p-2.5 text-foreground/60 hover:bg-muted'
            >
              <RefreshCw
                className={`size-4 ${isRefetching ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className='flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90'
            >
              <Plus className='size-4' /> Tạo chiến dịch
            </button>
          </div>
        </div>

        <div className='overflow-hidden rounded-xl border border-border bg-card'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-foreground/40'>
                  <th className='px-5 py-3.5'>Chiến dịch</th>
                  <th className='px-5 py-3.5'>Ưu đãi</th>
                  <th className='px-5 py-3.5'>Thời gian</th>
                  <th className='px-5 py-3.5'>Mã nhận</th>
                  <th className='px-5 py-3.5'>Trạng thái</th>
                  <th className='px-5 py-3.5 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className='px-5 py-4'>
                        <div className='h-5 animate-pulse rounded bg-muted' />
                      </td>
                    </tr>
                  ))
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-5 py-16 text-center text-muted-foreground'
                    >
                      <Sparkles className='mx-auto mb-2 size-8 text-foreground/20' />
                      Chưa có chiến dịch nào. Tạo một chiến dịch để thẻ ưu đãi
                      hiện ra cho khách.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => {
                    const meta = STATUS_META[c.status] ?? STATUS_META.draft;
                    const canActivate =
                      c.status === 'draft' ||
                      c.status === 'scheduled' ||
                      c.status === 'paused';
                    const canPause =
                      c.status === 'active' || c.status === 'scheduled';
                    const isEnded = c.status === 'ended';

                    return (
                      <tr key={c.id} className='hover:bg-muted/50'>
                        <td className='px-5 py-3.5'>
                          <span className='font-semibold text-foreground'>
                            {c.title}
                          </span>
                          <span className='block font-mono text-[11px] text-muted-foreground'>
                            {c.name}
                          </span>
                        </td>
                        <td className='px-5 py-3.5 text-foreground/80'>
                          {benefitSummary(c)}
                          {c.minOrderVnd ? (
                            <span className='block text-[11px] text-muted-foreground'>
                              Đơn tối thiểu {formatCurrency(c.minOrderVnd)}
                            </span>
                          ) : null}
                        </td>
                        <td className='px-5 py-3.5 text-xs text-foreground/70'>
                          {formatDate(c.validFrom)} → {formatDate(c.validUntil)}
                        </td>
                        <td className='px-5 py-3.5 font-mono text-xs text-foreground/70'>
                          {c.publicClaimCode || '-'}
                        </td>
                        <td className='px-5 py-3.5'>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className='px-5 py-3.5'>
                          <div className='flex items-center justify-end gap-1'>
                            <button
                              onClick={() => setStatsFor(c)}
                              title='Xem hiệu quả'
                              className='rounded-lg p-1.5 text-foreground/60 hover:bg-muted'
                            >
                              <BarChart3 className='size-4' />
                            </button>
                            {!isEnded && (
                              <button
                                onClick={() => {
                                  setEditing(c);
                                  setModalOpen(true);
                                }}
                                title='Sửa'
                                className='rounded-lg p-1.5 text-foreground/60 hover:bg-muted'
                              >
                                <Pencil className='size-4' />
                              </button>
                            )}
                            {canActivate && (
                              <button
                                onClick={() =>
                                  lifecycle.mutate({
                                    id: c.id,
                                    action: 'activate',
                                  })
                                }
                                disabled={lifecycle.isPending}
                                title='Kích hoạt'
                                className='rounded-lg p-1.5 text-success hover:bg-success/10'
                              >
                                <Play className='size-4' />
                              </button>
                            )}
                            {canPause && (
                              <button
                                onClick={() =>
                                  lifecycle.mutate({ id: c.id, action: 'pause' })
                                }
                                disabled={lifecycle.isPending}
                                title='Tạm dừng'
                                className='rounded-lg p-1.5 text-warning hover:bg-warning/10'
                              >
                                <Pause className='size-4' />
                              </button>
                            )}
                            {!isEnded && (
                              <button
                                onClick={() =>
                                  lifecycle.mutate({ id: c.id, action: 'end' })
                                }
                                disabled={lifecycle.isPending}
                                title='Kết thúc (không hoàn tác được)'
                                className='rounded-lg p-1.5 text-destructive hover:bg-destructive/10'
                              >
                                <CircleStop className='size-4' />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className='mt-4 flex items-center justify-between text-sm text-muted-foreground'>
            <span>
              Trang {meta.page}/{meta.totalPages} · {meta.total} chiến dịch
            </span>
            <div className='flex gap-2'>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className='rounded-lg border border-border bg-card px-3 py-1.5 font-semibold disabled:opacity-40'
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className='rounded-lg border border-border bg-card px-3 py-1.5 font-semibold disabled:opacity-40'
              >
                Sau
              </button>
            </div>
          </div>
        )}

        <p className='mt-4 flex items-start gap-2 text-xs text-muted-foreground'>
          <AlertCircle className='mt-px size-3.5 shrink-0' />
          Chiến dịch mới luôn ở trạng thái nháp và chưa hiện với khách. Bấm Kích
          hoạt để công bố — nếu ngày bắt đầu còn ở tương lai thì chuyển sang
          &quot;Đã lên lịch&quot;.
        </p>
      </div>

      {modalOpen && (
        <CampaignModal
          editing={editing}
          submitting={save.isPending}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={(payload) => save.mutate(payload)}
        />
      )}
      {statsFor && (
        <StatsModal campaign={statsFor} onClose={() => setStatsFor(null)} />
      )}
    </main>
  );
}
