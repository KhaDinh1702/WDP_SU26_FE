'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  Gift,
  History,
  Info,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { getMyLoyalty, getMyLoyaltyTransactions } from '@/lib/customer-api';
import {
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTransactionType,
} from '@/types/loyalty';
import { formatNumber, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import LoyaltyCard from '@/components/profile/LoyaltyCard';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

const PAGE_SIZE = 10;
const API_PAGE_SIZE = 100;

const TYPE_META: Record<
  LoyaltyTransactionType,
  { label: string; className: string; icon: typeof Coins }
> = {
  earn_completed: {
    label: 'Tích điểm',
    className: 'bg-success/10 text-success',
    icon: Sparkles,
  },
  deduct_no_show: {
    label: 'Trừ điểm do vắng mặt',
    className: 'bg-destructive/10 text-destructive',
    icon: TrendingDown,
  },
  annual_reset: {
    label: 'Đặt lại điểm hằng năm',
    className: 'bg-warning/15 text-warning-foreground',
    icon: RefreshCcw,
  },
  voucher_granted: {
    label: 'Nhận voucher thưởng',
    className: 'bg-primary/10 text-primary',
    icon: Gift,
  },
  tier_changed: {
    label: 'Thay đổi hạng',
    className: 'bg-info/10 text-info',
    icon: ShieldCheck,
  },
};

const TIER_LABELS: Record<string, string> = {
  none: 'Thành viên',
  member: 'Thành viên',
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
};

function typeMeta(type: string) {
  return (
    TYPE_META[type as LoyaltyTransactionType] ?? {
      label: 'Giao dịch điểm',
      className: 'bg-muted text-muted-foreground',
      icon: Coins,
    }
  );
}

function tierLabel(value: string) {
  return TIER_LABELS[value.trim().toLowerCase()] ?? value.trim();
}

function transactionTitle(transaction: LoyaltyTransaction): string {
  const points = formatNumber(Math.abs(transaction.pointsDelta));

  switch (transaction.type) {
    case 'earn_completed':
      return `Đã cộng ${points} điểm sau khi hoàn tất đơn hàng`;
    case 'deduct_no_show':
      return `Đã trừ ${points} điểm do không đến theo lịch hẹn`;
    case 'annual_reset':
      return 'Điểm đã được đặt lại theo chu kỳ hằng năm';
    case 'voucher_granted':
      return 'Bạn đã nhận voucher thưởng sau 10 lượt rửa hợp lệ';
    case 'tier_changed': {
      const match = transaction.reason?.match(
        /tier changed:\s*(.+?)\s*→\s*(.+)$/i,
      );
      return match
        ? `Hạng thành viên: ${tierLabel(match[1])} → ${tierLabel(match[2])}`
        : 'Hạng thành viên đã được cập nhật';
    }
    default:
      return transaction.reason || 'Giao dịch điểm thưởng';
  }
}

/** Mã tham chiếu hiển thị tuỳ loại giao dịch. */
function refOf(t: LoyaltyTransaction): { label: string; value: string } | null {
  if (t.voucherId) return { label: 'Mã voucher', value: t.voucherId };
  if (t.orderId) return { label: 'Mã đơn', value: t.orderId };
  return null;
}

function timeOf(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function rowsFromResponse(response: Awaited<ReturnType<typeof getMyLoyaltyTransactions>>) {
  const body = response.data;
  if (Array.isArray(body)) return body as LoyaltyTransaction[];
  return Array.isArray(body?.data) ? (body.data as LoyaltyTransaction[]) : [];
}

async function getAllLoyaltyTransactions(): Promise<LoyaltyTransaction[]> {
  const firstResponse = await getMyLoyaltyTransactions(1, API_PAGE_SIZE);
  const firstRows = rowsFromResponse(firstResponse);
  const totalPages = Number(firstResponse.data?.meta?.totalPages ?? 1);

  if (totalPages <= 1) return firstRows;

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getMyLoyaltyTransactions(index + 2, API_PAGE_SIZE),
    ),
  );

  return [
    ...firstRows,
    ...remainingResponses.flatMap((response) => rowsFromResponse(response)),
  ];
}

export default function LoyaltyTransactionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: getMyLoyalty,
  });

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-loyalty-transactions', 'all'],
    queryFn: getAllLoyaltyTransactions,
  });

  const loyalty: LoyaltyAccount | null =
    loyaltyData?.data?.data ?? loyaltyData?.data ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const meta = typeMeta(transaction.type);
      const reference = refOf(transaction);
      const matchesType =
        typeFilter === 'all' || transaction.type === typeFilter;
      const matchesSearch =
        !q ||
        transactionTitle(transaction).toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        (reference?.value ?? '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [transactions, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleExport = () => {
    const header = [
      'Ngày giao dịch',
      'Nội dung',
      'Mã tham chiếu',
      'Loại',
      'Điểm',
      'Số dư',
    ];
    const rows = filtered.map((transaction) => [
      `${formatDate(transaction.createdAt)} ${timeOf(transaction.createdAt)}`.trim(),
      transactionTitle(transaction),
      refOf(transaction)?.value ?? '',
      typeMeta(transaction.type).label,
      String(transaction.pointsDelta),
      transaction.balanceAfter != null ? String(transaction.balanceAfter) : '',
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lich-su-diem-thuong.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='space-y-6'>
      {/* Header cân chiều cao với card để không tạo khoảng trắng vô nghĩa. */}
      <div className='grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <section className='relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-primary/10 bg-card p-6 shadow-[0_18px_50px_-38px_rgba(37,78,180,0.65)] sm:p-7'>
          <div className='absolute -right-20 -top-24 -z-10 size-64 rounded-full bg-primary/8 blur-3xl' />
          <div>
            <span className='mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <History className='size-5' />
            </span>
            <h1 className='font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
              Lịch sử điểm thưởng
            </h1>
            <p className='mt-2 max-w-xl text-sm leading-6 text-muted-foreground'>
              Theo dõi điểm đã tích lũy, các lần thay đổi hạng và voucher thưởng
              trong một nơi.
            </p>
          </div>
          <div className='mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
            <p className='text-muted-foreground'>
              <span className='font-semibold tabular-nums text-foreground'>
                {formatNumber(loyalty?.pointsBalance ?? 0)}
              </span>{' '}
              điểm hiện có
            </p>
            <p className='text-muted-foreground'>
              <span className='font-semibold tabular-nums text-foreground'>
                {transactions.length}
              </span>{' '}
              giao dịch
            </p>
          </div>
        </section>
        <div className='w-full xl:w-[360px]'>
          <LoyaltyCard loyalty={loyalty} />
        </div>
      </div>

      <section className='space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_18px_45px_-38px_rgba(30,58,138,0.55)] sm:p-6'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder='Tìm theo nội dung hoặc mã đơn...'
              className='h-11 rounded-xl bg-background pl-9'
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className='h-11 w-full rounded-xl bg-background lg:w-56'>
              <SelectValue placeholder='Bộ lọc' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tất cả giao dịch</SelectItem>
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className='inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-all hover:border-primary/25 hover:bg-primary/5 hover:text-primary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
          >
            <Download className='size-4' /> Xuất CSV
          </button>
        </div>

        {isLoading ? (
          <div className='flex min-h-72 flex-col items-center justify-center gap-3'>
            <Spinner className='size-8 text-primary' />
            <p className='text-sm font-semibold text-muted-foreground'>
              Đang tải lịch sử điểm thưởng...
            </p>
          </div>
        ) : error ? (
          <div className='flex min-h-64 flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center'>
            <Info className='size-8 text-destructive' />
            <h3 className='mt-3 font-heading text-lg font-bold text-foreground'>
              Chưa thể tải lịch sử điểm
            </h3>
            <p className='mt-1 max-w-md text-sm text-muted-foreground'>
              Kết nối đang gặp sự cố. Bạn có thể thử tải lại dữ liệu.
            </p>
            <button
              onClick={() => refetch()}
              className='mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted'
            >
              <RefreshCcw className='size-4' /> Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title='Không tìm thấy giao dịch'
            description={
              transactions.length === 0
                ? 'Bạn chưa có hoạt động điểm thưởng. Hoàn tất một đơn rửa xe để bắt đầu tích điểm.'
                : 'Hãy thay đổi từ khóa hoặc bộ lọc để xem các giao dịch khác.'
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className='hidden overflow-hidden rounded-xl border border-border/70 md:block'>
              <Table>
                <TableHeader className='bg-muted/45'>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='w-36'>Ngày giao dịch</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className='w-48'>Loại</TableHead>
                    <TableHead className='w-24 text-right'>Điểm</TableHead>
                    <TableHead className='w-24 text-right'>Số dư</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((transaction) => {
                    const reference = refOf(transaction);
                    return (
                      <TableRow key={transaction.id} className='group/row'>
                        <TableCell className='align-top'>
                          <p className='font-semibold tabular-nums text-foreground'>
                            {formatDate(transaction.createdAt)}
                          </p>
                          <p className='text-xs tabular-nums text-muted-foreground'>
                            {timeOf(transaction.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell className='align-top'>
                          <p className='font-semibold leading-5 text-foreground'>
                            {transactionTitle(transaction)}
                          </p>
                          {reference && (
                            <p className='mt-0.5 max-w-md truncate text-xs text-muted-foreground'>
                              {reference.label}: {reference.value}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className='align-top'>
                          <TransactionBadge transaction={transaction} />
                        </TableCell>
                        <TableCell className='text-right align-top'>
                          <PointsDelta value={transaction.pointsDelta} />
                        </TableCell>
                        <TableCell className='text-right align-top font-semibold tabular-nums text-foreground'>
                          {transaction.balanceAfter != null
                            ? formatNumber(transaction.balanceAfter)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards: không ép người dùng cuộn ngang một bảng năm cột. */}
            <div className='space-y-3 md:hidden'>
              {pageRows.map((transaction) => {
                const reference = refOf(transaction);
                return (
                  <article
                    key={transaction.id}
                    className='rounded-xl border border-border/70 bg-muted/25 p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <TransactionBadge transaction={transaction} />
                      <div className='shrink-0 text-right text-xs tabular-nums text-muted-foreground'>
                        <p>{formatDate(transaction.createdAt)}</p>
                        <p>{timeOf(transaction.createdAt)}</p>
                      </div>
                    </div>
                    <h2 className='mt-3 text-sm font-semibold leading-5 text-foreground'>
                      {transactionTitle(transaction)}
                    </h2>
                    {reference && (
                      <p className='mt-1 truncate text-xs text-muted-foreground'>
                        {reference.label}: {reference.value}
                      </p>
                    )}
                    <div className='mt-4 flex items-end justify-between border-t border-border/60 pt-3'>
                      <div>
                        <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                          Thay đổi
                        </p>
                        <PointsDelta value={transaction.pointsDelta} />
                      </div>
                      <div className='text-right'>
                        <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                          Số dư sau giao dịch
                        </p>
                        <p className='font-semibold tabular-nums text-foreground'>
                          {transaction.balanceAfter != null
                            ? `${formatNumber(transaction.balanceAfter)} điểm`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className='flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-xs text-muted-foreground'>
                Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} trong số{' '}
                {filtered.length} giao dịch
              </p>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  aria-label='Trang trước'
                  className='flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35'
                >
                  <ChevronLeft className='size-4' />
                </button>
                <span className='min-w-16 text-center text-sm font-semibold tabular-nums text-foreground'>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label='Trang sau'
                  className='flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35'
                >
                  <ChevronRight className='size-4' />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby='loyalty-help-title' className='space-y-3'>
        <div>
          <h2 id='loyalty-help-title' className='font-heading text-lg font-bold text-foreground'>
            Cách điểm thưởng hoạt động
          </h2>
          <p className='text-sm text-muted-foreground'>
            Ba thông tin quan trọng để bạn theo dõi quyền lợi dễ hơn.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <InfoCard
            icon={Coins}
            title='Tích điểm sau mỗi đơn'
            description='Điểm được cộng khi đơn rửa xe hoàn tất và dùng để xác định hạng thành viên của bạn.'
          />
          <InfoCard
            icon={CalendarClock}
            title='Chu kỳ điểm hằng năm'
            description='Số dư điểm được đặt lại vào đầu mỗi năm theo chính sách của chương trình thành viên.'
          />
          <InfoCard
            icon={ShieldCheck}
            title='Quyền lợi theo hạng'
            description='Hạng càng cao, mức giảm giá, thời gian đặt trước và tốc độ tích điểm càng tốt.'
          />
        </div>
      </section>
    </div>
  );
}

function TransactionBadge({
  transaction,
}: {
  transaction: LoyaltyTransaction;
}) {
  const meta = typeMeta(transaction.type);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold leading-4',
        meta.className,
      )}
    >
      <Icon className='size-3.5 shrink-0' />
      <span className='truncate'>{meta.label}</span>
    </span>
  );
}

function PointsDelta({ value }: { value: number }) {
  return (
    <span
      className={cn(
        'font-bold tabular-nums',
        value > 0
          ? 'text-success'
          : value < 0
            ? 'text-destructive'
            : 'text-foreground',
      )}
    >
      {value > 0 ? `+${formatNumber(value)}` : formatNumber(value)}
    </span>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Coins;
  title: string;
  description: string;
}) {
  return (
    <article className='rounded-2xl bg-card p-5 shadow-[0_16px_40px_-34px_rgba(30,58,138,0.6)] ring-1 ring-border/60'>
      <div className='mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
        <Icon className='size-5' />
      </div>
      <h3 className='font-heading font-bold text-foreground'>{title}</h3>
      <p className='mt-1 text-sm leading-6 text-muted-foreground'>{description}</p>
    </article>
  );
}
