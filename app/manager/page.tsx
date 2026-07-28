'use client';

/**
 * Trang tổng quan + báo cáo vận hành của Manager (gộp làm 1).
 * - Phần trên: thao tác realtime (cần xử lý ngay + xe đang rửa) từ work-orders.
 * - Phần dưới: báo cáo đầy đủ theo bộ lọc thời gian từ GET /admin/dashboard.
 */

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { DonutChart } from '@/components/admin/dashboard/DonutChart';
import { CancellationNoShowSection } from '@/components/admin/dashboard/CancellationNoShow';
import {
  BarList,
  DashboardSection,
  DayRevenueChart,
  DetailGroupCard,
  EmptyBlock,
  HourStrip,
  InlineStats,
  KpiCard,
  Panel,
  RankBadge,
  RankingTable,
} from '@/components/admin/dashboard/parts';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { WasherStatusMini } from '@/components/washers/WasherStatusMini';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { adminGetDashboard, adminGetWorkOrders } from '@/lib/admin-api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import type { DashboardReport } from '@/types/dashboard';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Gift,
  Layers,
  RotateCcw,
  TrendingDown,
  Undo2,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { ElementType } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import {
  DateRangeFilter,
  type DateFilterValue,
} from '@/components/admin/dashboard/DateRangeFilter';
import { DEFAULT_PERIOD, getRangeForPeriod } from '@/lib/date-range';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { StatusTone } from '@/constants';

/* Real work-order shape (BE WorkOrderResponseDto). */
interface WorkOrderRow {
  id?: string;
  _id?: string;
  code?: string;
  status?: string; // waiting | assigned | in_progress | done
  serviceName?: string;
  assignedWasherName?: string;
  vehicleSnapshot?: { plate?: string };
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã nhận xe',
  in_progress: 'Đang rửa',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
  no_show: 'Không đến',
};

// BE đã bỏ luồng QC — work order kết thúc ở "done" ngay khi thợ rửa xong.
const WO_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  waiting: { label: 'Chờ gán thợ', tone: 'warning' },
  assigned: { label: 'Đã gán thợ', tone: 'info' },
  in_progress: { label: 'Đang rửa', tone: 'primary' },
  done: { label: 'Hoàn thành', tone: 'success' },
};

export default function ManagerOverviewPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<DateFilterValue>(() => ({
    period: DEFAULT_PERIOD,
    range: getRangeForPeriod(DEFAULT_PERIOD),
  }));

  // Báo cáo đầy đủ theo kỳ đã chọn.
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: [
      'manager-dashboard',
      filter.period,
      filter.range.from,
      filter.range.to,
    ],
    queryFn: async () => {
      const res = await adminGetDashboard({
        fromDate: filter.range.from,
        toDate: filter.range.to,
        period: filter.period,
        topN: 5,
      });
      return res.data as DashboardReport;
    },
    placeholderData: keepPreviousData,
  });
  const isRefetching = isFetching && !isLoading;

  // Phiếu rửa xe realtime (cảnh báo + bảng xe đang rửa) — không theo kỳ.
  const { data: workOrdersData, isLoading: woLoading } = useQuery({
    queryKey: ['manager-overview-workorders'],
    queryFn: () => adminGetWorkOrders({ limit: 100 }),
  });
  // Socket wash:*/order:status → cụm "Cần xử lý ngay" và bảng xe đang rửa
  // tự cập nhật không cần reload.
  const invalidateWorkOrders = () => {
    void qc.invalidateQueries({ queryKey: ['manager-overview-workorders'] });
  };
  useSocketEvent('order:status', invalidateWorkOrders);
  useSocketEvent('wash:assigned', invalidateWorkOrders);
  useSocketEvent('wash:started', invalidateWorkOrders);
  useSocketEvent('wash:completed', invalidateWorkOrders);
  const workOrders: WorkOrderRow[] =
    workOrdersData?.data?.data ?? workOrdersData?.data ?? [];

  const waitingCount = workOrders.filter((w) => w.status === 'waiting').length;
  const assignedCount = workOrders.filter(
    (w) => w.status === 'assigned',
  ).length;
  const inProgressCount = workOrders.filter(
    (w) => w.status === 'in_progress',
  ).length;
  const activeWorkOrders = workOrders.filter((w) => w.status !== 'done');

  return (
    <>
      <AdminTopbar
        title='Tổng quan vận hành'
      />
      <main className='flex-1 p-6 lg:p-8 overflow-y-auto bg-background'>
        <div className='max-w-7xl mx-auto flex flex-col gap-8'>
          {/* Bộ lọc thời gian (áp cho báo cáo phía dưới) */}
          <DateRangeFilter
            value={filter}
            onChange={setFilter}
            isFetching={isRefetching}
          />

          {/* ── Cần xử lý ngay (realtime) + thợ theo nhóm hành vi đối diện ── */}
          <section className='flex flex-col gap-4'>
            <h2 className='font-heading text-base font-semibold tracking-tight text-foreground'>
              Cần xử lý ngay
            </h2>
            <div className='grid gap-4 lg:grid-cols-3'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-2'>
                <AlertCard
                  icon={UserPlus}
                  count={waitingCount}
                  label='Đơn chờ gán thợ'
                  sub='Cần phân công thợ rửa'
                  href='/manager/work-orders'
                  active={waitingCount > 0}
                />
                <AlertCard
                  icon={ClipboardCheck}
                  count={assignedCount}
                  label='Đơn đã gán thợ'
                  sub='Chờ thợ bắt đầu rửa'
                  href='/manager/work-orders'
                  active={assignedCount > 0}
                />
                <AlertCard
                  icon={RotateCcw}
                  count={inProgressCount}
                  label='Xe đang rửa'
                  sub='Thợ đang thực hiện'
                  href='/manager/work-orders'
                  active={inProgressCount > 0}
                />
              </div>
              {/* Thợ nhóm theo hành vi, đặt đối diện cụm cần xử lý để nhìn
                  một phát là biết còn ai rảnh mà điều phối. */}
              <WasherStatusMini href='/manager/washers' />
            </div>
          </section>

          {/* ── Đơn xe đang rửa thực tế (realtime) ── */}
          <div className='bg-card rounded-xl border border-border shadow-xs overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-5 border-b border-border'>
              <h2 className='font-heading font-semibold tracking-tight text-foreground text-base'>
                Đơn xe đang rửa thực tế
              </h2>
              <Link
                href='/manager/work-orders'
                className='text-xs font-semibold text-primary hover:underline flex items-center gap-1'
              >
                Xem tất cả vận hành <ArrowRight className='w-3 h-3' />
              </Link>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-muted/50 border-b border-border'>
                    <th className='text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>Mã số</th>
                    <th className='text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>Biển số xe</th>
                    <th className='text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>Dịch vụ</th>
                    <th className='text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>Thợ phụ trách</th>
                    <th className='text-right px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>Trạng thái</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {woLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className='px-6 py-4'>
                            <div className='h-4 bg-muted animate-pulse rounded-md' />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : activeWorkOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className='px-6 py-12 text-center text-muted-foreground'>
                        Chưa có xe nào đang được rửa. Đơn mới sẽ hiện ở đây.
                      </td>
                    </tr>
                  ) : (
                    activeWorkOrders.slice(0, 6).map((w) => {
                      const id = w.id ?? w._id ?? '';
                      const s = WO_STATUS[w.status ?? ''] ?? {
                        label: w.status ?? '-',
                        tone: 'muted' as StatusTone,
                      };
                      return (
                        <tr key={id} className='hover:bg-muted/40 transition-colors'>
                          <td className='px-6 py-4 font-mono text-xs text-muted-foreground'>
                            {w.code ?? (id ? id.slice(-6).toUpperCase() : '-')}
                          </td>
                          <td className='px-4 py-4'>
                            <span className='text-xs font-mono font-semibold text-foreground bg-muted rounded px-2 py-1'>
                              {w.vehicleSnapshot?.plate ?? '-'}
                            </span>
                          </td>
                          <td className='px-4 py-4 text-foreground'>
                            {w.serviceName ?? '-'}
                          </td>
                          <td className='px-4 py-4 text-muted-foreground'>
                            {w.assignedWasherName ?? (
                              <span className='flex items-center gap-1'>
                                <Clock className='w-3 h-3' /> Chưa phân công
                              </span>
                            )}
                          </td>
                          <td className='px-6 py-4 text-right'>
                            <StatusBadge label={s.label} tone={s.tone} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Báo cáo vận hành đầy đủ (theo kỳ) ── */}
          <QueryBoundary
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            loading={<DashboardSkeleton />}
          >
            {data && (
              <div className='relative'>
                {isRefetching && (
                  <div className='pointer-events-none absolute inset-0 z-10 rounded-xl bg-background/50' />
                )}
                {data.overview.totalBookings === 0 && (
                  <div className='mb-6 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground'>
                    Không có booking nào trong khoảng thời gian đã chọn - các
                    chỉ số sẽ hiển thị 0.
                  </div>
                )}
                <ManagerReportBody report={data} />
              </div>
            )}
          </QueryBoundary>
        </div>
      </main>
    </>
  );
}

/* ── Cảnh báo thao tác ── */
function AlertCard({
  icon: Icon,
  count,
  label,
  sub,
  href,
  active,
  danger,
}: {
  icon: ElementType;
  count: number;
  label: string;
  sub: string;
  href: string;
  active: boolean;
  danger?: boolean;
}) {
  const accent = !active
    ? 'text-muted-foreground bg-muted'
    : danger
      ? 'text-destructive bg-destructive/10'
      : 'text-warning bg-warning/15';
  return (
    <Link
      href={href}
      className='group bg-card rounded-xl p-5 border border-border shadow-xs hover:border-primary/40 transition-colors'
    >
      <div className='flex items-start justify-between mb-3'>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className='w-5 h-5' />
        </div>
        <span className='text-2xl font-bold text-foreground tabular-nums'>
          {formatNumber(count)}
        </span>
      </div>
      <p className='text-sm font-medium text-foreground'>{label}</p>
      <p className='text-xs text-muted-foreground mt-0.5'>{sub}</p>
    </Link>
  );
}

/* ── Thân báo cáo vận hành (đồng bộ bộ lọc thời gian) ── */
function ManagerReportBody({ report }: { report: DashboardReport }) {
  const { overview, revenue, bookings, washers, vehicles } = report;
  const { voucherLoyalty, services, refundDispute, schedule } = report;

  return (
    <div className='flex flex-col gap-10'>
      {/* 1 - TỔNG QUAN TRỌNG TÂM: 4 chỉ số chính + hàng chỉ số phụ.
          Donut trạng thái chuyển xuống mục Đặt lịch; donut doanh thu theo
          dịch vụ bỏ vì trùng với mục Dịch vụ & Phương tiện. */}
      <DashboardSection
        title='Tổng quan kỳ đã chọn'
        icon={Layers}
      >
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          <KpiCard
            label='Doanh thu thực nhận'
            value={formatCurrency(overview.netRevenue)}
            hint='Sau giảm giá & hoàn tiền'
            icon={CircleDollarSign}
            tone='success'
          />
          <KpiCard
            label='Tổng đặt lịch'
            value={formatNumber(overview.totalBookings)}
            hint={`${formatNumber(overview.completedBookings)} hoàn thành`}
            icon={CalendarCheck}
          />
          <KpiCard
            label='Đang chờ xử lý'
            value={formatNumber(overview.pendingBookings)}
            hint='Chưa hoàn thành'
            icon={Clock}
          />
          <KpiCard
            label='Huỷ / Không đến'
            value={`${formatNumber(overview.cancelledBookings)} / ${formatNumber(overview.noShowBookings)}`}
            icon={TrendingDown}
            tone='destructive'
          />
        </div>
        <InlineStats
          items={[
            {
              label: 'Giá trị đơn trung bình',
              value: formatCurrency(overview.averageOrderValue),
            },
            {
              label: 'Thợ đang hoạt động',
              value: formatNumber(overview.activeWashers),
            },
            {
              label: 'Voucher đã dùng',
              value: formatNumber(overview.usedVouchers),
            },
          ]}
        />
      </DashboardSection>

      {/* 2 - PHÂN TÍCH CHI TIẾT: dashboard chỉ giữ tổng quan cơ bản, mỗi
          nhóm số liệu mở ra trong modal riêng để tập trung từng việc một. */}
      <DashboardSection
        title='Phân tích chi tiết'
        subtitle='Bấm vào từng nhóm để mở số liệu đầy đủ của kỳ đã chọn.'
        icon={Layers}
      >
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {/* Biểu đồ tổng quan hiển thị sẵn; bấm vào mở các biểu đồ còn lại. */}
          <DetailGroupCard
            title='Doanh thu theo ngày'
            subtitle='Bấm để xem theo dịch vụ và loại xe'
            icon={CircleDollarSign}
            className='sm:col-span-2 lg:col-span-3'
            preview={
              revenue.byDay.length === 0 ? (
                <EmptyBlock message='Chưa có doanh thu trong kỳ này' />
              ) : (
                <DayRevenueChart
                  data={revenue.byDay}
                  formatValue={formatCurrency}
                />
              )
            }
          >
            <div className='grid gap-4 lg:grid-cols-2'>
              <Panel title='Dịch vụ được dùng nhiều nhất'>
                <BarList
                  items={services.mostUsed.map((s) => ({
                    label: s.name,
                    value: s.count,
                  }))}
                  format={(v) => `${formatNumber(v)} đơn`}
                  emptyMessage='Chưa có đặt lịch trong khoảng thời gian này'
                />
              </Panel>
              <Panel title='Doanh thu theo dịch vụ'>
                <BarList
                  items={services.byRevenue.map((s) => ({
                    label: s.name,
                    value: s.revenue,
                    caption: `${formatNumber(s.orders)} đơn`,
                  }))}
                  format={formatCurrency}
                  emptyMessage='Chưa có doanh thu trong khoảng thời gian này'
                  accent='bg-success'
                />
              </Panel>
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
              <Panel
                title='Cơ cấu loại xe hiện có'
                hint='Tổng xe trên hệ thống (không theo kỳ)'
              >
                <DonutChart
                  data={vehicles.byType.map((v) => ({
                    label: v.name,
                    value: v.count,
                  }))}
                  formatValue={(v) => `${formatNumber(v)} xe`}
                  centerCaption='xe'
                  emptyMessage='Chưa có phương tiện nào'
                />
              </Panel>
              <Panel title='Doanh thu theo loại xe'>
                <BarList
                  items={vehicles.revenueByType.map((v) => ({
                    label: v.name,
                    value: v.revenue,
                    caption: `${formatNumber(v.orders)} đơn`,
                  }))}
                  format={formatCurrency}
                  emptyMessage='Chưa có doanh thu trong khoảng thời gian này'
                  accent='bg-success'
                />
              </Panel>
            </div>
          </DetailGroupCard>

          <DetailGroupCard
            title='Tình hình đặt lịch'
            subtitle='Bấm để xem tỷ lệ hoàn thành/huỷ và khung giờ'
            icon={CalendarCheck}
            preview={
              <DonutChart
                data={Object.entries(bookings.statusSummary).map(
                  ([key, count]) => ({
                    label: STATUS_LABELS[key] ?? key,
                    value: count,
                  }),
                )}
                centerCaption='đơn'
                emptyMessage='Chưa có đặt lịch nào trong khoảng thời gian này'
              />
            }
          >
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <KpiCard
                label='Tỷ lệ hoàn thành'
                value={formatPercent(bookings.completionRate)}
                icon={CalendarCheck}
                tone='success'
              />
              <KpiCard
                label='Tỷ lệ huỷ'
                value={formatPercent(bookings.cancellationRate)}
                icon={TrendingDown}
                tone='destructive'
              />
              <KpiCard
                label='Tỷ lệ không đến'
                value={formatPercent(bookings.noShowRate)}
                icon={AlertTriangle}
                tone='warning'
              />
            </div>
            <Panel
              title='Khung giờ đông khách'
              hint='Số đơn theo giờ trong ngày - cột đậm là giờ cao điểm'
            >
              <HourStrip
                data={bookings.byHour}
                emptyMessage='Chưa có đặt lịch trong khoảng thời gian này'
              />
            </Panel>
          </DetailGroupCard>

          <DetailGroupCard
            title='Hiệu suất thợ rửa'
            subtitle='Bấm để xem bảng chi tiết từng thợ'
            icon={Wrench}
            preview={
              <BarList
                items={washers.slice(0, 5).map((w) => ({
                  label: w.name,
                  value: w.completedJobs,
                }))}
                format={(v) => `${formatNumber(v)} lượt`}
                emptyMessage='Chưa có thợ nào hoàn thành lượt rửa trong kỳ này'
              />
            }
          >
            <div className='flex justify-end'>
              <Link
                href='/manager/washers'
                className='text-xs font-semibold text-primary hover:underline'
              >
                Xem giám sát trực tiếp →
              </Link>
            </div>
        <Panel title='Top thợ rửa'>
          <RankingTable
            rows={washers}
            rowKey={(w) => w.id}
            emptyMessage='Chưa có thợ nào hoàn thành lượt rửa trong khoảng thời gian này'
            columns={[
              { header: '#', cell: (_w, i) => <RankBadge index={i} /> },
              {
                header: 'Thợ rửa',
                cell: (w) => (
                  <span className='font-medium text-foreground'>{w.name}</span>
                ),
              },
              {
                header: 'Hoàn thành',
                align: 'right',
                cell: (w) => (
                  <span className='font-semibold tabular-nums'>
                    {formatNumber(w.completedJobs)}
                  </span>
                ),
              },
              {
                header: 'Được giao',
                align: 'right',
                cell: (w) => (
                  <span className='tabular-nums text-muted-foreground'>
                    {formatNumber(w.assignedJobs)}
                  </span>
                ),
              },
              {
                header: 'Thời gian TB',
                align: 'right',
                cell: (w) => (
                  <span className='tabular-nums text-muted-foreground'>
                    {w.averageServiceMinutes > 0
                      ? `${formatNumber(w.averageServiceMinutes)} phút`
                      : 'Chưa có'}
                  </span>
                ),
              },
              {
                header: 'Đúng giờ',
                align: 'right',
                cell: (w) => (
                  <span className='tabular-nums'>
                    {formatPercent(w.onTimeRate)}
                  </span>
                ),
              },
              {
                header: 'Đánh giá',
                align: 'right',
                cell: (w) => (
                  <span className='tabular-nums text-muted-foreground'>
                    {w.averageRating != null && w.feedbackCount > 0
                      ? `★ ${w.averageRating.toFixed(1)} (${formatNumber(w.feedbackCount)})`
                      : '-'}
                  </span>
                ),
              },
            ]}
          />
        </Panel>
          </DetailGroupCard>

          <DetailGroupCard
            title='Voucher & Hoàn tiền'
            subtitle='Bấm để xem số phát hành, đã dùng, hoàn tiền'
            icon={Gift}
            preview={
              <DonutChart
                data={[
                  { label: 'Chưa dùng', value: voucherLoyalty.unused },
                  { label: 'Đã dùng', value: voucherLoyalty.used },
                  { label: 'Hết hạn', value: voucherLoyalty.expired },
                ]}
                centerCaption='voucher'
                emptyMessage='Chưa có voucher nào trong khoảng thời gian này'
              />
            }
          >
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <KpiCard
            label='Voucher đã phát'
            value={formatNumber(voucherLoyalty.totalIssued)}
            icon={Gift}
          />
          <KpiCard
            label='Đã dùng'
            value={formatNumber(voucherLoyalty.used)}
            hint={`Tỷ lệ ${formatPercent(voucherLoyalty.redemptionRate)}`}
            icon={Gift}
            tone='success'
          />
          <KpiCard
            label='Số đơn hoàn tiền'
            value={formatNumber(refundDispute.refundCount)}
            hint={`Tổng ${formatCurrency(refundDispute.refundAmount)}`}
            icon={Undo2}
            tone='destructive'
          />
        </div>
          </DetailGroupCard>

          {report.cancellationNoShow && (
            <DetailGroupCard
              title='Hủy lịch & Không đến'
              subtitle='Bấm để xem lý do huỷ và khách cần lưu ý'
              icon={AlertTriangle}
              hideModalHeader
              preview={
                <DonutChart
                  data={[
                    {
                      label: 'Đã huỷ',
                      value: report.cancellationNoShow.totalCancelled,
                    },
                    {
                      label: 'Không đến',
                      value: report.cancellationNoShow.totalNoShow,
                    },
                  ]}
                  centerCaption='đơn'
                  emptyMessage='Không có đơn huỷ/không đến trong kỳ này'
                />
              }
            >
              <CancellationNoShowSection
                data={report.cancellationNoShow}
                variant='manager'
              />
            </DetailGroupCard>
          )}

          <DetailGroupCard
            title='Lịch làm việc & Chỗ đặt'
            subtitle='Bấm để xem số ca, sức chứa, giờ cao điểm'
            icon={Clock}
            preview={
              <BarList
                items={[
                  { label: 'Chỗ đã đặt', value: schedule.bookedSlots },
                  { label: 'Còn trống', value: schedule.availableSlots },
                ]}
                format={(v) => `${formatNumber(v)} chỗ`}
                emptyMessage='Chưa có ca làm việc trong kỳ này'
                accent='bg-info'
              />
            }
          >
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <KpiCard
            label='Tổng ca làm'
            value={formatNumber(schedule.totalShifts)}
            icon={Clock}
          />
          <KpiCard
            label='Sức chứa tối đa'
            value={formatNumber(schedule.totalCapacity)}
            hint='Số xe có thể nhận trong kỳ'
            icon={Layers}
          />
          <KpiCard
            label='Chỗ đã đặt / còn trống'
            value={`${formatNumber(schedule.bookedSlots)} / ${formatNumber(schedule.availableSlots)}`}
            icon={CalendarCheck}
          />
        </div>
        <Panel title='Khung giờ cao điểm (Top 3)'>
          {schedule.peakHours.length === 0 ? (
            <EmptyBlock message='Chưa có đặt lịch trong khoảng thời gian này' />
          ) : (
            <ul className='flex flex-wrap gap-3'>
              {schedule.peakHours.map((h) => (
                <li
                  key={h.hour}
                  className='flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2'
                >
                  <Clock className='size-4 text-primary' />
                  <span className='font-semibold text-foreground'>
                    {h.hour}:00 - {h.hour + 1}:00
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {formatNumber(h.count)} đơn
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
          </DetailGroupCard>
        </div>
      </DashboardSection>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className='h-24 animate-pulse rounded-xl border border-border bg-muted/40'
          />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className='h-64 animate-pulse rounded-xl border border-border bg-muted/40'
          />
        ))}
      </div>
    </div>
  );
}
