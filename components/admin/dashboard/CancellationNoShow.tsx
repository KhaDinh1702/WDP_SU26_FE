'use client';

import {
  AlertTriangle,
  CalendarX,
  TrendingDown,
  UserX,
} from 'lucide-react';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  CancellationNoShowAnalytics,
  CustomerRiskRow,
} from '@/types/dashboard';
import { DonutChart } from './DonutChart';
import {
  BarList,
  DashboardSection,
  EmptyBlock,
  KpiCard,
  Panel,
  RankBadge,
  type RankColumn,
  RankingTable,
} from './parts';

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  'cancelled by customer': 'Khách hàng hủy lịch',
  'canceled by customer': 'Khách hàng hủy lịch',
  'customer cancelled': 'Khách hàng hủy lịch',
  'customer canceled': 'Khách hàng hủy lịch',
  'user cancelled': 'Khách hàng hủy lịch',
  'user canceled': 'Khách hàng hủy lịch',
  'customer request': 'Khách hàng yêu cầu hủy',
  'cancelled by staff': 'Nhân viên hủy lịch',
  'canceled by staff': 'Nhân viên hủy lịch',
  'staff cancelled': 'Nhân viên hủy lịch',
  'staff canceled': 'Nhân viên hủy lịch',
  'cancelled by admin': 'Quản trị viên hủy lịch',
  'canceled by admin': 'Quản trị viên hủy lịch',
  'admin cancelled': 'Quản trị viên hủy lịch',
  'admin canceled': 'Quản trị viên hủy lịch',
  'cancelled by store': 'Cửa hàng hủy lịch',
  'canceled by store': 'Cửa hàng hủy lịch',
  'store cancelled': 'Cửa hàng hủy lịch',
  'store canceled': 'Cửa hàng hủy lịch',
  'payment timeout': 'Quá hạn thanh toán',
  'payment expired': 'Quá hạn thanh toán',
  'unpaid timeout': 'Quá hạn thanh toán',
  'system cancelled': 'Hệ thống tự động hủy',
  'system canceled': 'Hệ thống tự động hủy',
  'auto cancelled': 'Hệ thống tự động hủy',
  'auto canceled': 'Hệ thống tự động hủy',
  'cancelled by system': 'Hệ thống tự động hủy',
  'canceled by system': 'Hệ thống tự động hủy',
  'duplicate booking': 'Đặt lịch trùng',
  'changed mind': 'Khách hàng đổi ý',
  'change of plan': 'Khách hàng thay đổi kế hoạch',
  other: 'Lý do khác',
  unknown: 'Không xác định',
};

function localizeCancellationReason(reason: string) {
  const raw = reason.trim();
  if (!raw) return 'Không xác định';

  const key = raw
    .toLowerCase()
    .replace(/[–—_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const translated = CANCELLATION_REASON_LABELS[key];
  if (translated) return translated;

  if (/\bauto(?:matically)? cancell?ed\b/.test(key)) {
    return 'Hệ thống tự động hủy';
  }
  if (/\bpayment\b.*\b(?:timeout|expired)\b/.test(key)) {
    return 'Quá hạn thanh toán';
  }

  return raw;
}

function groupCancellationReasons(
  reasons: CancellationNoShowAnalytics['cancellationReasons'],
) {
  const grouped = new Map<string, number>();
  for (const reason of reasons) {
    const label = localizeCancellationReason(reason.name);
    grouped.set(label, (grouped.get(label) ?? 0) + reason.count);
  }
  return Array.from(grouped, ([label, value]) => ({ label, value }));
}

/**
 * Cancellation & No-show (Customer Reliability) analytics. Shared by the admin
 * and manager dashboards. `variant='admin'` shows the full breakdown; the
 * manager variant is compact. Phone is rendered only when the backend sent a
 * (masked) value - it is null for the manager scope.
 */
export function CancellationNoShowSection({
  data,
  variant = 'admin',
}: {
  data: CancellationNoShowAnalytics;
  variant?: 'admin' | 'manager';
}) {
  const showPhone =
    data.topCancellingCustomers.some((r) => r.phoneMasked) ||
    data.topNoShowCustomers.some((r) => r.phoneMasked);
  const cancellationReasonData = groupCancellationReasons(
    data.cancellationReasons,
  );

  return (
    <DashboardSection
      title='Hủy lịch & Không đến'
      subtitle='Khách hàng hay hủy / không đến và độ tin cậy đặt lịch.'
      icon={CalendarX}
    >
      {/* KPI */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Tổng booking bị huỷ'
          value={formatNumber(data.totalCancelled)}
          icon={CalendarX}
          tone='destructive'
        />
        <KpiCard
          label='Tỷ lệ huỷ'
          value={formatPercent(data.cancellationRate)}
          icon={TrendingDown}
          tone='warning'
        />
        <KpiCard
          label='Tổng booking không đến'
          value={formatNumber(data.totalNoShow)}
          icon={UserX}
          tone='destructive'
        />
        <KpiCard
          label='Tỷ lệ không đến'
          value={formatPercent(data.noShowRate)}
          icon={AlertTriangle}
          tone='warning'
        />
      </div>

      {/* Trend + reason */}
      <div className='grid gap-4 lg:grid-cols-2'>
        <Panel title='Xu hướng huỷ & không đến theo ngày'>
          <TrendChart data={data.trendByDay} />
        </Panel>
        <Panel
          title='Cơ cấu lý do huỷ'
        >
          <div className='mx-auto w-full max-w-lg'>
            <DonutChart
              data={cancellationReasonData}
              centerCaption='lượt huỷ'
              emptyMessage='Chưa có booking bị huỷ trong khoảng thời gian này'
            />
          </div>
        </Panel>
      </div>

      {/* Ranking tables */}
      <div className='grid gap-4 lg:grid-cols-2'>
        <Panel title='Top khách huỷ nhiều nhất'>
          <RankingTable
            rows={data.topCancellingCustomers}
            rowKey={(r) => r.id}
            emptyMessage='Chưa có dữ liệu khách hàng huỷ đơn'
            columns={riskColumns('Số lần huỷ', showPhone)}
          />
        </Panel>
        <Panel title='Top khách không đến nhiều nhất'>
          <RankingTable
            rows={data.topNoShowCustomers}
            rowKey={(r) => r.id}
            emptyMessage='Chưa có dữ liệu khách hàng không đến'
            columns={riskColumns('Số lần không đến', showPhone)}
          />
        </Panel>
      </div>

      {/* Admin-only deeper breakdown */}
      {variant === 'admin' && (
        <div className='grid gap-4 lg:grid-cols-2'>
          <Panel title='Dịch vụ bị huỷ nhiều nhất'>
            <BarList
              items={data.cancelledByService.map((s) => ({
                label: s.name,
                value: s.count,
              }))}
              format={(v) => `${formatNumber(v)} lượt`}
              emptyMessage='Chưa có booking bị huỷ trong khoảng thời gian này'
              accent='bg-destructive'
            />
          </Panel>
          <Panel title='Dịch vụ bị no-show nhiều nhất'>
            <BarList
              items={data.noShowByService.map((s) => ({
                label: s.name,
                value: s.count,
              }))}
              format={(v) => `${formatNumber(v)} lượt`}
              emptyMessage='Chưa có booking no-show trong khoảng thời gian này'
              accent='bg-warning'
            />
          </Panel>
        </div>
      )}

    </DashboardSection>
  );
}

function riskColumns(
  countHeader: string,
  showPhone: boolean,
): RankColumn<CustomerRiskRow>[] {
  const cols: RankColumn<CustomerRiskRow>[] = [
    {
      header: '#',
      align: 'center',
      className: 'w-12',
      cell: (_r, i) => <RankBadge index={i} />,
    },
    {
      header: 'Khách hàng',
      className: 'min-w-36',
      cell: (r) => (
        <span className='block truncate font-medium text-foreground' title={r.name}>
          {r.name}
        </span>
      ),
    },
  ];
  if (showPhone) {
    cols.push({
      header: 'Điện thoại',
      align: 'center',
      className: 'min-w-28',
      cell: (r) => (
        <span className='font-mono text-xs text-muted-foreground'>
          {r.phoneMasked ?? '—'}
        </span>
      ),
    });
  }
  cols.push(
    {
      header: 'Tổng booking',
      align: 'center',
      className: 'min-w-24',
      cell: (r) => (
        <span className='tabular-nums text-muted-foreground'>
          {formatNumber(r.totalBookings)}
        </span>
      ),
    },
    {
      header: countHeader,
      align: 'center',
      className: 'min-w-32',
      cell: (r) => (
        <span className='font-semibold tabular-nums'>
          {formatNumber(r.count)}
        </span>
      ),
    },
    {
      header: 'Tỷ lệ',
      align: 'center',
      className: 'min-w-20',
      cell: (r) => (
        <span
          className={cn(
            'tabular-nums font-medium',
            r.rate >= 50
              ? 'text-destructive'
              : r.rate >= 25
                ? 'text-warning'
                : 'text-muted-foreground',
          )}
        >
          {formatPercent(r.rate)}
        </span>
      ),
    },
    {
      header: 'Gần nhất',
      align: 'center',
      className: 'min-w-28',
      cell: (r) => (
        <span className='tabular-nums text-muted-foreground'>
          {r.lastAt ? formatDate(r.lastAt) : '—'}
        </span>
      ),
    },
  );
  return cols;
}

/** Grouped daily bars: cancelled (rose) vs no-show (amber). */
function TrendChart({
  data,
}: {
  data: { key: string; cancelled: number; noShow: number }[];
}) {
  const total = data.reduce((s, d) => s + d.cancelled + d.noShow, 0);
  if (total === 0) {
    return (
      <EmptyBlock message='Chưa có huỷ / no-show trong khoảng thời gian này' />
    );
  }
  const max = Math.max(...data.map((d) => Math.max(d.cancelled, d.noShow)), 1);
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-4 text-xs text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-full bg-destructive' /> Huỷ
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-full bg-warning' /> Không đến
        </span>
      </div>
      <div className='flex items-end gap-1.5 overflow-x-auto' style={{ height: 150 }}>
        {data.map((d) => (
          <div
            key={d.key}
            className='group flex min-w-4.5 max-w-16 flex-1 flex-col items-center justify-end gap-1'
            style={{ height: '100%' }}
            title={`${d.key}: huỷ ${d.cancelled}, không đến ${d.noShow}`}
          >
            <div className='flex h-full w-full items-end justify-center gap-0.5'>
              <div
                className='w-1/2 rounded-t-sm bg-destructive/70 transition-colors group-hover:bg-destructive'
                style={{ height: `${Math.max((d.cancelled / max) * 100, d.cancelled ? 4 : 0)}%` }}
              />
              <div
                className='w-1/2 rounded-t-sm bg-warning/70 transition-colors group-hover:bg-warning'
                style={{ height: `${Math.max((d.noShow / max) * 100, d.noShow ? 4 : 0)}%` }}
              />
            </div>
            <span className='whitespace-nowrap text-[9px] text-muted-foreground'>
              {d.key.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
