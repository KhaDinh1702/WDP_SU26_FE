'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/* ─── Section wrapper ───────────────────────────────────────────────────── */

export function DashboardSection({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className='flex flex-col gap-4'>
      <div className='flex items-end justify-between gap-4'>
        <div className='flex items-center gap-2.5'>
          {Icon && (
            <span className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Icon className='size-4' />
            </span>
          )}
          <div>
            <h2 className='font-heading text-base font-bold tracking-tight text-foreground'>
              {title}
            </h2>
            {subtitle && (
              <p className='text-xs text-muted-foreground'>{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ─── Detail group: card bấm vào mở modal chứa phân tích đầy đủ ─────────── */

export function DetailGroupCard({
  title,
  subtitle,
  icon: Icon,
  hideModalHeader = false,
  preview,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Ẩn header modal khi nội dung con đã tự render tiêu đề riêng. */
  hideModalHeader?: boolean;
  /**
   * Biểu đồ tổng quan hiển thị sẵn trên dashboard; bấm vào cả khối để mở
   * modal chứa các biểu đồ chi tiết còn lại. Không truyền thì hiển thị dạng
   * card gọn chỉ có tiêu đề.
   */
  preview?: ReactNode;
  className?: string;
  /** Nội dung phân tích chi tiết, chỉ hiển thị trong modal. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          'group rounded-xl border border-border bg-card text-left shadow-xs transition-colors hover:border-primary/40',
          preview ? 'flex w-full flex-col' : 'flex items-center gap-3 p-4',
          className,
        )}
      >
        {preview ? (
          <>
            <span className='flex items-center gap-3 border-b border-border px-5 py-3.5'>
              {Icon && (
                <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <Icon className='size-4' />
                </span>
              )}
              <span className='min-w-0 flex-1'>
                <span className='block text-sm font-bold text-foreground'>
                  {title}
                </span>
                {subtitle && (
                  <span className='mt-0.5 block truncate text-xs text-muted-foreground'>
                    {subtitle}
                  </span>
                )}
              </span>
              <span className='inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary'>
                Xem chi tiết
                <ArrowUpRight className='size-3.5' />
              </span>
            </span>
            <span className='pointer-events-none block p-5'>{preview}</span>
          </>
        ) : (
          <>
            {Icon && (
              <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Icon className='size-5' />
              </span>
            )}
            <span className='min-w-0 flex-1'>
              <span className='block text-sm font-semibold text-foreground'>
                {title}
              </span>
              {subtitle && (
                <span className='mt-0.5 block truncate text-xs text-muted-foreground'>
                  {subtitle}
                </span>
              )}
            </span>
            <ArrowUpRight className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary' />
          </>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader className={hideModalHeader ? 'sr-only' : undefined}>
            <DialogTitle>{title}</DialogTitle>
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </DialogHeader>
          <div className='flex flex-col gap-4'>{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Biểu đồ doanh thu theo ngày (dùng chung admin/manager) ────────────── */

export function DayRevenueChart({
  data,
  formatValue,
}: {
  data: { key: string; revenue: number; orders: number }[];
  formatValue: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div
      className='flex items-end gap-1.5 overflow-x-auto'
      style={{ height: 160 }}
    >
      {data.map((d) => {
        const height = Math.max((d.revenue / max) * 100, 3);
        const label = d.key.slice(5); // MM-DD
        return (
          <div
            key={d.key}
            className='group flex min-w-4.5 max-w-16 flex-1 flex-col items-center justify-end'
            style={{ height: '100%' }}
            title={`${d.key}: ${formatValue(d.revenue)} (${d.orders} đơn)`}
          >
            <div
              className='w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary'
              style={{ height: `${height}%` }}
            />
            <span className='mt-1 rotate-0 whitespace-nowrap text-[9px] text-muted-foreground'>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Secondary inline stats (hàng chỉ số phụ, không dùng card) ─────────── */

export function InlineStats({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className='flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5'>
      {items.map((it) => (
        <span key={it.label} className='text-xs text-muted-foreground'>
          {it.label}:{' '}
          <span className='font-semibold text-foreground tabular-nums'>
            {it.value}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ─── KPI card ──────────────────────────────────────────────────────────── */

type Tone = 'default' | 'success' | 'destructive' | 'warning' | 'primary';

const toneIcon: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
  primary: 'bg-primary/10 text-primary',
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className='flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4'>
      <div className='min-w-0 space-y-1'>
        <p className='truncate text-xs font-medium text-muted-foreground'>
          {label}
        </p>
        <p className='font-heading text-xl font-bold tracking-tight text-foreground'>
          {value}
        </p>
        {hint && <p className='truncate text-xs text-muted-foreground'>{hint}</p>}
      </div>
      {Icon && (
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            toneIcon[tone],
          )}
        >
          <Icon className='size-4' />
        </span>
      )}
    </div>
  );
}

/* ─── Card surface for charts/tables ────────────────────────────────────── */

export function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card',
        className,
      )}
    >
      <div className='border-b border-border px-5 py-3.5'>
        <h3 className='text-sm font-bold text-foreground'>{title}</h3>
        {hint && <p className='mt-0.5 text-xs text-muted-foreground'>{hint}</p>}
      </div>
      <div className='flex-1 p-5'>{children}</div>
    </div>
  );
}

/* ─── Inline empty state ────────────────────────────────────────────────── */

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 py-8 text-center'>
      <Inbox className='size-6 text-muted-foreground/50' />
      <p className='text-sm text-muted-foreground'>{message}</p>
    </div>
  );
}

/* ─── Horizontal bar list (ranking by a numeric metric) ─────────────────── */

export type BarItem = { label: string; value: number; caption?: string };

export function BarList({
  items,
  format,
  emptyMessage,
  accent = 'bg-primary',
}: {
  items: BarItem[];
  format: (v: number) => string;
  emptyMessage: string;
  accent?: string;
}) {
  if (items.length === 0) return <EmptyBlock message={emptyMessage} />;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className='flex flex-col gap-3'>
      {items.map((it, idx) => (
        <li key={`${it.label}-${idx}`} className='space-y-1.5'>
          <div className='flex items-baseline justify-between gap-3 text-sm'>
            <span className='min-w-0 truncate font-medium text-foreground'>
              {it.label}
            </span>
            <span className='shrink-0 font-semibold text-foreground tabular-nums'>
              {format(it.value)}
            </span>
          </div>
          <div className='h-2 overflow-hidden rounded-full bg-muted'>
            <div
              className={cn('h-full rounded-full', accent)}
              style={{ width: `${Math.max((it.value / max) * 100, 2)}%` }}
            />
          </div>
          {it.caption && (
            <p className='text-xs text-muted-foreground'>{it.caption}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ─── Top-N ranking table ───────────────────────────────────────────────── */

export type RankColumn<T> = {
  header: string;
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
};

export function RankingTable<T>({
  rows,
  columns,
  emptyMessage,
  rowKey,
}: {
  rows: T[];
  columns: RankColumn<T>[];
  emptyMessage: string;
  rowKey: (row: T, index: number) => string;
}) {
  if (rows.length === 0) return <EmptyBlock message={emptyMessage} />;
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border'>
            {columns.map((c, i) => (
              <th
                key={i}
                className={cn(
                  'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                  c.align === 'right'
                    ? 'text-right'
                    : c.align === 'center'
                      ? 'text-center'
                      : 'text-left',
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={rowKey(row, ri)}
              className='border-b border-border/50 last:border-0 hover:bg-muted/40'
            >
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-3 py-2.5 text-foreground',
                    c.align === 'right'
                      ? 'text-right'
                      : c.align === 'center'
                        ? 'text-center'
                        : 'text-left',
                    c.className,
                  )}
                >
                  {c.cell(row, ri)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Rank badge (1,2,3 highlighted) ────────────────────────────────────── */

export function RankBadge({ index }: { index: number }) {
  const top = index < 3;
  return (
    <span
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums',
        top ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {index + 1}
    </span>
  );
}

/* ─── 24-hour demand strip ──────────────────────────────────────────────── */

export function HourStrip({
  data,
  emptyMessage,
}: {
  data: { hour: number; count: number }[];
  emptyMessage: string;
}) {
  const byHour = new Map(data.map((d) => [d.hour, d.count]));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyBlock message={emptyMessage} />;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className='flex items-end gap-0.75' style={{ height: 120 }}>
      {Array.from({ length: 24 }).map((_, h) => {
        const count = byHour.get(h) ?? 0;
        const height = count === 0 ? 2 : Math.max((count / max) * 100, 6);
        const isPeak = count === max && count > 0;
        return (
          <div
            key={h}
            className='group relative flex flex-1 flex-col items-center justify-end'
            style={{ height: '100%' }}
          >
            <div
              className={cn(
                'w-full rounded-t-sm transition-colors',
                isPeak ? 'bg-primary' : count > 0 ? 'bg-primary/40' : 'bg-muted',
              )}
              style={{ height: `${height}%` }}
              title={`${h}:00 - ${count} đơn`}
            />
            {h % 3 === 0 && (
              <span className='mt-1 text-[9px] text-muted-foreground'>{h}h</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
