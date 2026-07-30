'use client';

import {
  adminGetVouchers,
  adminGetVoucherStats,
  adminGetVoucherBatches,
  adminGetVoucherCampaigns,
  adminGrantVoucher,
  adminBulkCreateVouchers,
  adminRevokeVoucher,
  adminGetUsers,
  adminGetOrders,
} from '@/lib/admin-api';
import type {
  BulkCreateVoucherPayload,
  GrantVoucherPayload,
  VoucherBatch,
  VoucherCampaign,
  VoucherStats,
  VoucherStatus,
} from '@/types/voucher';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { formatCurrency } from '@/lib/format';
import { voucherBenefitLabel, voucherTitle } from '@/lib/voucher';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Ticket,
  Plus,
  Search,
  X,
  Ban,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Voucher } from '@/types/voucher';

type VoucherMode = 'admin' | 'manager';

interface CustomerLite {
  id: string;
  name: string;
  email: string;
}

// `VoucherStatusEnum`: `reserved` = đang giữ cho một đơn chưa hoàn tất;
// `revoked` = bị quản trị thu hồi sớm và KHÔNG được gộp vào `expired`.
const statusConfig: Record<string, { label: string; cls: string }> = {
  unused: {
    label: 'Chưa dùng',
    cls: 'bg-success/10 text-success border border-success/30',
  },
  reserved: {
    label: 'Đang giữ',
    cls: 'bg-warning/10 text-warning border border-warning/30',
  },
  used: {
    label: 'Đã dùng',
    cls: 'bg-muted text-muted-foreground border border-border',
  },
  expired: {
    label: 'Hết hạn',
    cls: 'bg-destructive/10 text-destructive border border-destructive/30',
  },
  revoked: {
    label: 'Đã thu hồi',
    cls: 'bg-destructive/10 text-destructive border border-destructive/30',
  },
};

const statusTabs: { value: 'all' | VoucherStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unused', label: 'Chưa dùng' },
  { value: 'reserved', label: 'Đang giữ' },
  { value: 'used', label: 'Đã dùng' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'revoked', label: 'Đã thu hồi' },
];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '-';

// ─────────────────── Modal tạo voucher (2 chế độ) ───────────────────
// pool  = tạo 1 lô N voucher không chủ, khách tự nhận bằng mã (POST /bulk).
// grant = cấp đích danh 1 voucher cho 1 khách cụ thể (POST /).
type CreateVoucherSubmit =
  | { mode: 'pool'; payload: BulkCreateVoucherPayload }
  | { mode: 'grant'; payload: GrantVoucherPayload };

function VoucherCreateModal({
  mode,
  customers,
  campaigns,
  onClose,
  onSubmit,
  submitting,
}: {
  mode: VoucherMode;
  customers: CustomerLite[];
  campaigns: VoucherCampaign[];
  onClose: () => void;
  onSubmit: (result: CreateVoucherSubmit) => void;
  submitting: boolean;
}) {
  const [tab, setTab] = useState<'pool' | 'grant'>('pool');

  // Trường dùng chung
  const [discountCapVnd, setDiscountCapVnd] = useState(100000);
  const [expiresAt, setExpiresAt] = useState('');
  // `reason` được lưu trên voucher để đối soát về sau (5-500 ký tự).
  const [reason, setReason] = useState('');

  // pool
  const [quantity, setQuantity] = useState(10);
  const [prefix, setPrefix] = useState('');
  // Lô gắn vào chiến dịch nào. Rỗng = voucher rời, chỉ nhận được bằng cách gõ mã.
  const [campaignId, setCampaignId] = useState('');

  // grant
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 8);
    const q = search.toLowerCase();
    return customers
      .filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, search]);

  const capValid = discountCapVnd >= 1 && discountCapVnd <= 200000;
  const quantityValid = quantity >= 1 && quantity <= 1000;
  const prefixValid =
    prefix.trim() === '' || /^[A-Z0-9]{1,15}$/.test(prefix.trim());
  // `GrantVoucherAdmin.code` là `^[A-Z0-9-]{3,30}$` (không phải 40 như mã claim).
  const codeValid = code.trim() === '' || /^[A-Za-z0-9-]{3,30}$/.test(code.trim());
  const reasonValid =
    reason.trim() === '' ||
    (reason.trim().length >= 5 && reason.trim().length <= 500);

  /** Lô đang gắn vào một chiến dịch → chiến dịch quyết định hạn dùng và mức giảm. */
  const boundToCampaign = tab === 'pool' && campaignId !== '';

  const canSubmit =
    reasonValid &&
    // Trần giảm chỉ còn ý nghĩa với voucher rời.
    (boundToCampaign || capValid) &&
    (tab === 'pool'
      ? quantityValid && prefixValid
      : customerId.trim().length > 0 && codeValid);

  const submit = () => {
    if (!canSubmit) return;
    const iso = expiresAt ? new Date(expiresAt).toISOString() : undefined;
    const reasonPayload = reason.trim() ? { reason: reason.trim() } : {};
    if (tab === 'pool') {
      // Lô thuộc chiến dịch thì chiến dịch nắm luật: KHÔNG gửi kèm expiresAt và
      // discountCapVnd — BE bỏ qua chúng, gửi lên chỉ tạo ảo giác là đã đặt được.
      onSubmit({
        mode: 'pool',
        payload: {
          quantity,
          ...(prefix.trim() ? { prefix: prefix.trim().toUpperCase() } : {}),
          ...(boundToCampaign
            ? { campaignId }
            : { discountCapVnd, ...(iso ? { expiresAt: iso } : {}) }),
          ...reasonPayload,
        },
      });
    } else {
      onSubmit({
        mode: 'grant',
        payload: {
          customerId: customerId.trim(),
          discountCapVnd,
          ...(iso ? { expiresAt: iso } : {}),
          ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
          ...reasonPayload,
        },
      });
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
      onClick={onClose}
    >
      <div
        className='bg-card rounded-xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-5'>
          <h3 className='font-heading font-semibold text-foreground text-lg flex items-center gap-2'>
            <Ticket className='w-5 h-5 text-primary' /> Tạo voucher rửa miễn phí
          </h3>
          <button onClick={onClose} aria-label='Đóng'>
            <X className='w-5 h-5 text-foreground/40' />
          </button>
        </div>

        {/* Chọn chế độ */}
        <div className='grid grid-cols-2 gap-2 mb-5'>
          <button
            type='button'
            onClick={() => setTab('pool')}
            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
              tab === 'pool'
                ? 'border-primary bg-accent'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <span className='block text-sm font-semibold text-foreground'>
              Tạo lô
            </span>
            <span className='block text-[11px] text-muted-foreground'>
              Khách tự nhận bằng mã
            </span>
          </button>
          <button
            type='button'
            onClick={() => setTab('grant')}
            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
              tab === 'grant'
                ? 'border-primary bg-accent'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <span className='block text-sm font-semibold text-foreground'>
              Cấp đích danh
            </span>
            <span className='block text-[11px] text-muted-foreground'>
              Gán cho 1 khách cụ thể
            </span>
          </button>
        </div>

        <div className='flex flex-col gap-4'>
          {tab === 'pool' ? (
            <>
              {/* Chiến dịch — quyết định lô này có hiện thành thẻ cho khách không */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Thuộc chiến dịch
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  <option value=''>
                    Không thuộc chiến dịch (khách phải gõ mã)
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.status !== 'active' ? ` — ${c.status}` : ''}
                    </option>
                  ))}
                </select>
                <p className='mt-1.5 text-[11px] text-muted-foreground'>
                  {boundToCampaign
                    ? 'Lô này vào kho của chiến dịch — khách bấm "Nhận" trên trang Ưu đãi là lấy được.'
                    : 'Voucher rời không hiện thành thẻ ưu đãi; khách chỉ nhận được nếu bạn đưa mã cho họ.'}
                </p>
              </div>

              {/* Số lượng */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Số lượng voucher trong lô
                </label>
                <input
                  type='number'
                  min={1}
                  max={1000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
                {!quantityValid && (
                  <p className='mt-1.5 text-[11px] text-destructive'>
                    Số lượng phải từ 1 đến 1000.
                  </p>
                )}
              </div>

              {/* Tiền tố mã */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Tiền tố mã{' '}
                  <span className='normal-case text-placeholder'>
                    (bỏ trống = WASH)
                  </span>
                </label>
                <input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder='VD: TET2026'
                  className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
                {!prefixValid ? (
                  <p className='mt-1.5 text-[11px] text-destructive'>
                    Tiền tố chỉ gồm 1-15 ký tự A-Z hoặc 0-9.
                  </p>
                ) : (
                  <p className='mt-1.5 text-[11px] text-muted-foreground'>
                    Mã sinh ra dạng{' '}
                    <span className='font-mono'>
                      {(prefix.trim() || 'WASH').toUpperCase()}-XXXXXXXXXX
                    </span>{' '}
                    (hậu tố ngẫu nhiên, không chạy số). Đọc mã cho khách để họ tự
                    nhận.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chọn khách */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Khách hàng
                </label>
                {selectedCustomer ? (
                  <div className='flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-accent px-4 py-2.5'>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold text-foreground truncate'>
                        {selectedCustomer.name}
                      </p>
                      <p className='text-[11px] text-muted-foreground truncate'>
                        {selectedCustomer.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCustomerId('');
                        setSearch('');
                      }}
                      className='text-xs font-semibold text-primary shrink-0 cursor-pointer'
                    >
                      Đổi
                    </button>
                  </div>
                ) : (
                  <>
                    <div className='relative'>
                      <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-placeholder' />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Tìm theo tên hoặc email…'
                        className='w-full border border-input bg-background rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      />
                    </div>
                    {filteredCustomers.length > 0 && (
                      <div className='mt-2 border border-border rounded-lg divide-y divide-border max-h-52 overflow-y-auto'>
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setCustomerId(c.id)}
                            className='w-full text-left px-4 py-2.5 hover:bg-muted/50 cursor-pointer'
                          >
                            <p className='text-sm font-medium text-foreground truncate'>
                              {c.name}
                            </p>
                            <p className='text-[11px] text-muted-foreground truncate'>
                              {c.email}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {customers.length === 0 && (
                      <p className='mt-2 text-xs text-muted-foreground'>
                        Chưa có khách hàng để chọn
                        {mode === 'manager'
                          ? ' (danh sách lấy từ các đơn đặt lịch).'
                          : '.'}
                      </p>
                    )}
                    {search.trim() &&
                      customers.length > 0 &&
                      filteredCustomers.length === 0 && (
                        <p className='mt-2 text-xs text-muted-foreground'>
                          Không tìm thấy khách hàng phù hợp.
                        </p>
                      )}
                  </>
                )}
              </div>

              {/* Mã tuỳ chỉnh */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Mã voucher{' '}
                  <span className='normal-case text-placeholder'>
                    (bỏ trống = tự sinh)
                  </span>
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder='VD: FREEWASH-KHOI'
                  className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
                {!codeValid && (
                  <p className='mt-1.5 text-[11px] text-destructive'>
                    Mã chỉ gồm 3-30 ký tự A-Z, 0-9 hoặc dấu gạch ngang.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Lý do (chung) - BE lưu trên voucher để đối soát. */}
          <div>
            <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
              Lý do{' '}
              <span className='normal-case text-placeholder'>
                {tab === 'pool'
                  ? '(bỏ trống = "Lô phát hành <PREFIX>")'
                  : '(bỏ trống = không ghi chú)'}
              </span>
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                tab === 'pool'
                  ? 'VD: Chiến dịch Tết 2026'
                  : 'VD: Đền bù khiếu nại đơn #1234'
              }
              className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            />
            {!reasonValid && (
              <p className='mt-1.5 text-[11px] text-destructive'>
                Lý do cần từ 5 đến 500 ký tự.
              </p>
            )}
          </div>

          {/*
            Lô thuộc chiến dịch thì "campaign owns the rules": mức giảm do
            benefitType + discountValue của chiến dịch quyết định, hạn dùng do
            validUntil quyết định. BE bỏ qua hai field dưới đây, nên khoá lại
            thay vì để admin nhập rồi tưởng đã đặt được.
          */}
          {boundToCampaign ? (
            <div className='rounded-lg border border-primary/30 bg-accent p-3.5'>
              <p className='flex items-start gap-2 text-xs text-foreground'>
                <AlertCircle className='mt-px size-3.5 shrink-0 text-primary' />
                <span>
                  Mức giảm và hạn dùng lấy theo{' '}
                  <span className='font-semibold'>chiến dịch</span>. Muốn đổi thì
                  sửa ở trang Chiến dịch ưu đãi, không đặt tại lô.
                </span>
              </p>
            </div>
          ) : (
            <>
              {/* Giảm tối đa (voucher rời) */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Giảm tối đa (VND)
                </label>
                <input
                  type='number'
                  min={1}
                  max={200000}
                  step={1000}
                  value={discountCapVnd}
                  onChange={(e) => setDiscountCapVnd(Number(e.target.value))}
                  className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
                {!capValid && (
                  <p className='mt-1.5 text-[11px] text-destructive'>
                    Mức giảm phải từ 1 đến 200.000đ.
                  </p>
                )}
              </div>

              {/* Hết hạn (voucher rời) */}
              <div>
                <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                  Ngày hết hạn{' '}
                  <span className='normal-case text-placeholder'>
                    (bỏ trống = 90 ngày)
                  </span>
                </label>
                <input
                  type='date'
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className='w-full border border-input bg-background rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                />
              </div>
            </>
          )}
        </div>

        <div className='flex gap-3 mt-6'>
          <button
            onClick={onClose}
            className='flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted'
          >
            Huỷ
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className='flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {submitting
              ? 'Đang tạo…'
              : tab === 'pool'
                ? `Tạo ${quantityValid ? quantity : ''} voucher`
                : 'Cấp voucher'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Revoke modal ───────────────────────────
function RevokeModal({
  voucher,
  onClose,
  onSubmit,
  submitting,
}: {
  voucher: Voucher;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState('');
  const canSubmit = reason.trim().length >= 5;

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
      onClick={onClose}
    >
      <div
        className='bg-card rounded-xl p-7 w-full max-w-md shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-2'>
          <h3 className='font-heading font-semibold text-foreground text-lg flex items-center gap-2'>
            <Ban className='w-5 h-5 text-destructive' /> Thu hồi voucher
          </h3>
          <button
            onClick={onClose}
            aria-label='Đóng'
          >
            <X className='w-5 h-5 text-foreground/40' />
          </button>
        </div>
        {/* BE chuyển voucher sang trạng thái `revoked` RIÊNG, không gộp vào `expired`. */}
        <p className='text-sm text-muted-foreground mb-5'>
          Voucher{' '}
          <span className='font-bold text-foreground'>{voucher.code}</span> sẽ
          chuyển sang trạng thái <span className='font-semibold'>đã thu hồi</span>{' '}
          và không dùng được nữa. Báo cáo thống kê tách riêng khoản này, không
          tính là hết hạn.
        </p>

        <label className='block text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-1.5'>
          Lý do thu hồi <span className='text-destructive'>*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder='VD: Cấp nhầm khách hàng'
          className='w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none'
        />
        <p className='mt-1.5 text-[11px] text-muted-foreground'>
          Tối thiểu 5 ký tự.
        </p>

        <div className='flex gap-3 mt-6'>
          <button
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted'
          >
            Huỷ
          </button>
          <button
            onClick={() => canSubmit && onSubmit(reason.trim())}
            disabled={!canSubmit || submitting}
            className='flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {submitting ? 'Đang thu hồi…' : 'Thu hồi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── KPI tổng voucher ───────────────────────
function VoucherStatsRow({ stats }: { stats?: VoucherStats }) {
  // `reserved` và `revoked` là hai chỉ số RIÊNG của BE, không gộp vào chỉ số khác.
  const items: { label: string; value: number; tone: string }[] = [
    { label: 'Tổng phát hành', value: stats?.total ?? 0, tone: 'text-foreground' },
    { label: 'Chưa ai nhận', value: stats?.inPool ?? 0, tone: 'text-muted-foreground' },
    { label: 'Đã nhận, chưa dùng', value: stats?.claimed ?? 0, tone: 'text-primary' },
    { label: 'Đang giữ cho đơn', value: stats?.reserved ?? 0, tone: 'text-warning' },
    { label: 'Đã dùng', value: stats?.used ?? 0, tone: 'text-success' },
    { label: 'Hết hạn', value: stats?.expired ?? 0, tone: 'text-muted-foreground' },
    { label: 'Đã thu hồi', value: stats?.revoked ?? 0, tone: 'text-destructive' },
  ];
  return (
    <div className='mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7'>
      {items.map((it) => (
        <div
          key={it.label}
          className='rounded-xl border border-border bg-card p-4'
        >
          <p className={`font-heading text-2xl font-bold tabular-nums ${it.tone}`}>
            {it.value.toLocaleString('vi-VN')}
          </p>
          <p className='mt-0.5 text-xs text-muted-foreground'>{it.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────── Batch summary table ───────────────────────
function BatchTable({
  batches,
  loading,
}: {
  batches: VoucherBatch[];
  loading: boolean;
}) {
  return (
    <div className='bg-card border border-border rounded-xl overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-foreground/40'>
              <th className='px-5 py-3.5'>Lô</th>
              <th className='px-5 py-3.5 text-right'>Tổng</th>
              <th className='px-5 py-3.5 text-right'>Chưa ai nhận</th>
              <th className='px-5 py-3.5 text-right'>Đã nhận, chưa dùng</th>
              <th className='px-5 py-3.5 text-right'>Đã dùng</th>
              <th className='px-5 py-3.5 text-right'>Hết hạn</th>
              <th className='px-5 py-3.5 text-right'>Hạn dùng</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className='px-5 py-4'>
                    <div className='h-5 bg-muted rounded animate-pulse' />
                  </td>
                </tr>
              ))
            ) : batches.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className='px-5 py-16 text-center text-muted-foreground'
                >
                  <Ticket className='w-8 h-8 mx-auto mb-2 text-foreground/20' />
                  Chưa có lô voucher nào. Dùng &quot;Tạo voucher → Tạo lô&quot;
                  để tạo.
                </td>
              </tr>
            ) : (
              batches.map((b) => {
                // Tỷ lệ đã dùng trên số đã phát ra khỏi kho (đã nhận).
                const claimedTotal = b.used + b.claimed;
                const usedPct =
                  claimedTotal > 0
                    ? Math.round((b.used / claimedTotal) * 100)
                    : 0;
                return (
                  <tr key={b.batchKey} className='hover:bg-muted/50'>
                    <td className='px-5 py-3.5'>
                      <span className='font-mono font-semibold text-foreground'>
                        {b.prefix}
                      </span>
                      <span className='block text-[11px] text-muted-foreground'>
                        {fmtDate(b.createdAt)} · giảm tối đa{' '}
                        {formatCurrency(b.discountCapVnd)}
                      </span>
                    </td>
                    <td className='px-5 py-3.5 text-right font-semibold text-foreground tabular-nums'>
                      {b.total}
                    </td>
                    <td className='px-5 py-3.5 text-right tabular-nums text-muted-foreground'>
                      {b.inPool}
                    </td>
                    <td className='px-5 py-3.5 text-right tabular-nums text-foreground'>
                      {b.claimed}
                    </td>
                    <td className='px-5 py-3.5 text-right'>
                      <span className='font-semibold text-foreground tabular-nums'>
                        {b.used}
                      </span>
                      {claimedTotal > 0 && (
                        <span className='block text-[11px] text-muted-foreground'>
                          {usedPct}% người nhận
                        </span>
                      )}
                    </td>
                    <td className='px-5 py-3.5 text-right tabular-nums text-muted-foreground'>
                      {b.expired}
                    </td>
                    <td className='px-5 py-3.5 text-right tabular-nums text-muted-foreground'>
                      {fmtDate(b.expiresAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────── Main ───────────────────────────
export function VoucherManagement({ mode }: { mode: VoucherMode }) {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'batches'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | VoucherStatus>('all');
  const [page, setPage] = useState(1);
  const [showGrant, setShowGrant] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Voucher | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-vouchers', mode, statusFilter, page],
    queryFn: async () => {
      const res = await adminGetVouchers({
        page,
        limit: 20,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      return res.data;
    },
  });

  // Danh sách khách cho bộ chọn + map tên.
  // - Admin: lấy từ /admin/users (đầy đủ khách hàng).
  // - Manager: KHÔNG được phép gọi /admin/users, nên suy ra khách từ các đơn
  //   đặt lịch (/admin/orders manager xem được, đã kèm customerId + tên + email).
  const { data: customersData } = useQuery({
    queryKey: ['voucher-customers', mode],
    queryFn: async (): Promise<CustomerLite[]> => {
      if (mode === 'admin') {
        const res = await adminGetUsers({ role: 'customer', limit: 100 });
        const rows =
          (res.data?.data?.data as Record<string, unknown>[]) ??
          (res.data?.data as Record<string, unknown>[]) ??
          [];
        return rows.map((u) => ({
          id: String(u._id ?? u.id ?? ''),
          name: String(u.fullName ?? u.name ?? 'Khách hàng'),
          email: String(u.email ?? ''),
        }));
      }
      // manager → dedupe khách từ danh sách đơn
      const res = await adminGetOrders({ limit: 100 });
      const rows =
        (res.data?.data as Record<string, unknown>[]) ??
        (res.data as Record<string, unknown>[]) ??
        [];
      const map = new Map<string, CustomerLite>();
      for (const o of rows) {
        const id = String(o.customerId ?? '');
        if (!id || map.has(id)) continue;
        map.set(id, {
          id,
          name: String(o.customerName ?? 'Khách hàng'),
          email: String(o.customerEmail ?? ''),
        });
      }
      return [...map.values()];
    },
  });
  const customers = customersData ?? [];

  // Chiến dịch để gắn lô voucher vào. Chỉ lấy những chiến dịch còn nhận thêm
  // voucher — đã kết thúc thì không mint vào được nữa.
  const { data: campaignsData } = useQuery({
    // Cùng tiền tố với key ở trang quản trị chiến dịch để `invalidateQueries`
    // bên đó (khớp theo tiền tố) làm mới luôn ô chọn này.
    queryKey: ['admin-voucher-campaigns', 'for-batch'],
    queryFn: async (): Promise<VoucherCampaign[]> => {
      const res = await adminGetVoucherCampaigns({ limit: 100 });
      return (res.data?.data ?? []).filter((c) => c.status !== 'ended');
    },
  });
  const campaigns = campaignsData ?? [];
  const customerName = (id?: string) =>
    (id ? customers.find((c) => c.id === id)?.name : undefined) ?? id ?? '';

  const vouchers = data?.data ?? [];
  const meta = data?.meta;

  // Tổng toàn bộ voucher (dòng KPI đầu trang) — hiển thị ở cả 2 tab.
  const { data: stats } = useQuery({
    queryKey: ['admin-voucher-stats'],
    queryFn: async (): Promise<VoucherStats> => {
      const res = await adminGetVoucherStats();
      return res.data;
    },
  });

  // Thống kê theo lô (chỉ tải khi mở tab "Theo lô").
  const {
    data: batchData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
    isRefetching: batchesRefetching,
  } = useQuery({
    queryKey: ['admin-voucher-batches'],
    queryFn: async (): Promise<VoucherBatch[]> => {
      const res = await adminGetVoucherBatches();
      return res.data?.batches ?? [];
    },
    enabled: view === 'batches',
  });
  const batches = batchData ?? [];

  // Tạo lô voucher pool (1 call bulk) — khách tự nhận bằng mã sau đó.
  const bulkCreate = useMutation({
    mutationFn: (payload: BulkCreateVoucherPayload) =>
      adminBulkCreateVouchers(payload),
    onSuccess: (res) => {
      const count = res.data?.count ?? res.data?.vouchers?.length ?? 0;
      toast.success(
        `Đã tạo lô ${count} voucher. Khách dùng mã để tự nhận về tài khoản.`,
      );
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      qc.invalidateQueries({ queryKey: ['admin-voucher-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-voucher-batches'] });
      setShowGrant(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Cấp đích danh 1 voucher cho 1 khách cụ thể.
  const grant = useMutation({
    mutationFn: (payload: GrantVoucherPayload) => adminGrantVoucher(payload),
    onSuccess: () => {
      toast.success('Đã cấp voucher cho khách hàng.');
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      qc.invalidateQueries({ queryKey: ['admin-voucher-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-voucher-batches'] });
      setShowGrant(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminRevokeVoucher(id, reason),
    onSuccess: () => {
      toast.success('Đã thu hồi voucher');
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      qc.invalidateQueries({ queryKey: ['admin-voucher-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-voucher-batches'] });
      setRevokeTarget(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <main className='flex-1 p-8 overflow-y-auto'>
      <div className='max-w-6xl mx-auto'>
        {/* KPI tổng voucher toàn hệ thống */}
        <VoucherStatsRow stats={stats} />

        {/* View toggle: Danh sách / Theo lô */}
        <div className='flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 mb-4 w-fit'>
          {(
            [
              { value: 'list', label: 'Danh sách' },
              { value: 'batches', label: 'Theo lô' },
            ] as const
          ).map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                view === v.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/60 hover:bg-muted'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
          {view === 'list' ? (
            <div className='flex items-center gap-1.5 bg-card border border-border rounded-xl p-1'>
              {statusTabs.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setStatusFilter(t.value);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    statusFilter === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/60 hover:bg-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>
              Mỗi lô là một lần tạo hàng loạt (nhóm theo tiền tố mã và ngày
              tạo).
            </p>
          )}

          <div className='flex items-center gap-2'>
            <button
              onClick={() => (view === 'list' ? refetch() : refetchBatches())}
              className='p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground/60'
              title='Tải lại'
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  (view === 'list' ? isRefetching : batchesRefetching)
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>
            <button
              onClick={() => setShowGrant(true)}
              className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90'
            >
              <Plus className='w-4 h-4' /> Tạo voucher
            </button>
          </div>
        </div>

        {view === 'batches' && (
          <BatchTable
            batches={batches}
            loading={batchesLoading}
          />
        )}
        {view === 'list' && (
        <>
        {/* Table */}
        <div className='bg-card border border-border rounded-xl overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-foreground/40'>
                  <th className='px-5 py-3.5'>Mã voucher</th>
                  <th className='px-5 py-3.5'>Khách hàng</th>
                  <th className='px-5 py-3.5'>Chiến dịch</th>
                  <th className='px-5 py-3.5'>Ưu đãi</th>
                  <th className='px-5 py-3.5'>Trạng thái</th>
                  <th className='px-5 py-3.5'>Hết hạn</th>
                  <th className='px-5 py-3.5 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td
                        colSpan={7}
                        className='px-5 py-4'
                      >
                        <div className='h-5 bg-muted rounded animate-pulse' />
                      </td>
                    </tr>
                  ))
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-5 py-16 text-center text-muted-foreground'
                    >
                      <Ticket className='w-8 h-8 mx-auto mb-2 text-foreground/20' />
                      Chưa có voucher nào.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => {
                    const sc = statusConfig[v.status] ?? {
                      label: v.status,
                      cls: 'bg-muted text-muted-foreground',
                    };
                    return (
                      <tr
                        key={v.id}
                        className='hover:bg-muted/50'
                      >
                        <td className='px-5 py-3.5 font-mono font-bold text-foreground'>
                          {v.code}
                        </td>
                        <td className='px-5 py-3.5 text-foreground/80'>
                          {(() => {
                            // Voucher pool chưa ai nhận: không có customerId.
                            if (!v.customerId) {
                              return (
                                <span className='inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground'>
                                  <Ticket className='w-3 h-3' /> Trong kho — chờ
                                  khách nhận
                                </span>
                              );
                            }
                            // Ưu tiên tên kèm theo từ BE; nếu không có thì map
                            // từ danh sách khách đã tải (admin: từ users,
                            // manager: từ các đơn đặt lịch).
                            const name =
                              v.customerName ?? customerName(v.customerId);
                            return name && name !== v.customerId ? (
                              <span title={v.customerId}>
                                <span className='font-semibold text-foreground'>
                                  {name}
                                </span>
                                {v.customerEmail && (
                                  <span className='block text-[11px] text-muted-foreground'>
                                    {v.customerEmail}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className='font-mono text-xs text-foreground/60'>
                                {v.customerId}
                              </span>
                            );
                          })()}
                        </td>
                        <td className='px-5 py-3.5 text-foreground/80'>
                          {v.campaign ? (
                            <span className='text-xs font-semibold text-foreground'>
                              {voucherTitle(v)}
                            </span>
                          ) : (
                            // Voucher cũ migration chưa backfill: chạy theo hành
                            // vi legacy (chỉ có trần giảm, không ràng buộc).
                            <span className='text-[11px] text-muted-foreground'>
                              Không thuộc chiến dịch
                            </span>
                          )}
                        </td>
                        <td className='px-5 py-3.5 font-semibold text-foreground'>
                          {voucherBenefitLabel(v)}
                        </td>
                        <td className='px-5 py-3.5'>
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${sc.cls}`}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className='px-5 py-3.5 text-foreground/70'>
                          {fmtDate(v.expiresAt)}
                        </td>
                        <td className='px-5 py-3.5 text-right'>
                          {v.status === 'unused' ? (
                            <button
                              onClick={() => setRevokeTarget(v)}
                              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10'
                            >
                              <Ban className='w-3.5 h-3.5' /> Thu hồi
                            </button>
                          ) : (
                            <span className='text-xs text-foreground/30'>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className='flex items-center justify-between mt-4 text-sm text-muted-foreground'>
            <span>
              Trang {meta.page}/{meta.totalPages} · {meta.total} voucher
            </span>
            <div className='flex gap-2'>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className='px-3 py-1.5 rounded-lg border border-border bg-card font-semibold disabled:opacity-40'
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className='px-3 py-1.5 rounded-lg border border-border bg-card font-semibold disabled:opacity-40'
              >
                Sau
              </button>
            </div>
          </div>
        )}

        {mode === 'manager' && (
          <p className='mt-4 flex items-center gap-2 text-xs text-muted-foreground'>
            <AlertCircle className='w-3.5 h-3.5 shrink-0' />
            Danh sách khách để cấp voucher được lấy từ những khách đã có đơn đặt
            lịch.
          </p>
        )}
        </>
        )}
      </div>

      {showGrant && (
        <VoucherCreateModal
          mode={mode}
          customers={customers}
          campaigns={campaigns}
          submitting={bulkCreate.isPending || grant.isPending}
          onClose={() => setShowGrant(false)}
          onSubmit={(result) => {
            if (result.mode === 'pool') bulkCreate.mutate(result.payload);
            else grant.mutate(result.payload);
          }}
        />
      )}
      {revokeTarget && (
        <RevokeModal
          voucher={revokeTarget}
          submitting={revoke.isPending}
          onClose={() => setRevokeTarget(null)}
          onSubmit={(reason) => revoke.mutate({ id: revokeTarget.id, reason })}
        />
      )}
    </main>
  );
}
