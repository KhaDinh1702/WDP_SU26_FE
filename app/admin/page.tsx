'use client';

/**
 * Management Reporting / Operational Analytics Dashboard.
 *
 * Renders real aggregated data from GET /admin/dashboard - no mock data.
 * Report groups: Overview KPI, Revenue Analytics, Booking Analytics,
 * Washer Performance, Customer Analytics, Vehicle Analytics,
 * Voucher & Loyalty Analytics, Service Analytics, Refund & Dispute,
 * Schedule & Capacity. Every list falls back to an honest empty state.
 */

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarCheck,
  CircleDollarSign,
  Clock,
  Gift,
  Layers,
  Sparkles,
  TrendingDown,
  Undo2,
  Users,
  Wrench,
} from 'lucide-react';
import { CancellationNoShowSection } from '@/components/admin/dashboard/CancellationNoShow';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import {
  DateRangeFilter,
  type DateFilterValue,
} from '@/components/admin/dashboard/DateRangeFilter';
import { DonutChart } from '@/components/admin/dashboard/DonutChart';
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
import Link from 'next/link';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { WasherStatusMini } from '@/components/washers/WasherStatusMini';
import { adminGetDashboard } from '@/lib/admin-api';
import { DEFAULT_PERIOD, getRangeForPeriod } from '@/lib/date-range';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import type { DashboardReport } from '@/types/dashboard';

/* ─── Labels ──────────────────────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã nhận xe',
  in_progress: 'Đang rửa',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
  no_show: 'Không đến',
};

const PAYMENT_LABELS: Record<string, string> = {
  online: 'Chuyển khoản (PayOS)',
  cash: 'Tiền mặt',
};

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const [filter, setFilter] = useState<DateFilterValue>(() => ({
    period: DEFAULT_PERIOD,
    range: getRangeForPeriod(DEFAULT_PERIOD),
  }));

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: [
      'admin-dashboard',
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
    // Keep the previous window's data on screen while the new one loads so the
    // layout never collapses - we dim it with a light overlay instead.
    placeholderData: keepPreviousData,
  });

  const isRefetching = isFetching && !isLoading;

  return (
    <>
      <AdminTopbar
        title='Báo cáo quản trị & Phân tích vận hành'
      />
      <main className='flex-1 overflow-y-auto p-6 lg:p-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-8'>
          <DateRangeFilter
            value={filter}
            onChange={setFilter}
            isFetching={isRefetching}
          />

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
                    chỉ số doanh thu và đặt lịch sẽ hiển thị 0.
                  </div>
                )}
                <DashboardBody report={data} />
              </div>
            )}
          </QueryBoundary>
        </div>
      </main>
    </>
  );
}

/* ─── Body ────────────────────────────────────────────────────────────── */

function DashboardBody({ report }: { report: DashboardReport }) {
  const { overview, revenue, bookings, washers, customers } = report;
  const { vehicles, voucherLoyalty, services, refundDispute, schedule } =
    report;
  const inProgressBookings = bookings.statusSummary['in_progress'] ?? 0;
  // "Đang chờ xử lý" không gồm số đang rửa để tránh đếm trùng trong biểu đồ.
  const waitingBookings = Math.max(
    overview.pendingBookings - inProgressBookings,
    0,
  );

  return (
    <div className='flex flex-col gap-10'>
      {/* 1 ─ TỔNG QUAN TRỌNG TÂM: 4 chỉ số chính + hàng chỉ số phụ, kèm khối
          thợ theo nhóm hành vi đặt đối diện. Các donut cơ cấu bị bỏ khỏi đây
          vì trùng với mục Doanh thu / Đặt lịch. */}
      <DashboardSection
        title='Tổng quan'
        icon={Sparkles}
      >
        <div className='grid gap-4 lg:grid-cols-3'>
          <div className='flex flex-col gap-3 lg:col-span-2'>
            <div className='grid grid-cols-2 gap-3'>
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
                label='Đang xử lý'
                value={formatNumber(waitingBookings + inProgressBookings)}
                hint={`${formatNumber(inProgressBookings)} đang rửa · ${formatNumber(waitingBookings)} chờ`}
                icon={Clock}
                tone='primary'
              />
              <KpiCard
                label='Huỷ / Không đến'
                value={`${formatNumber(overview.cancelledBookings)} / ${formatNumber(overview.noShowBookings)}`}
                hint='Không tính doanh thu'
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
                  label: 'Khách hàng',
                  value: formatNumber(overview.totalCustomers),
                },
              ]}
            />
          </div>
          {/* Thợ nhóm theo hành vi — nhìn nhanh ai đang rửa/rảnh/trong ca. */}
          <WasherStatusMini href='/admin/washers' />
        </div>
      </DashboardSection>

      {/* 2 ─ PHÂN TÍCH CHI TIẾT: dashboard chỉ giữ tổng quan cơ bản, mỗi
          nhóm số liệu mở ra trong modal riêng. */}
      <DashboardSection
        title='Phân tích chi tiết'
        subtitle='Bấm vào từng nhóm để mở số liệu đầy đủ của kỳ đã chọn.'
        icon={Layers}
      >
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {/* Biểu đồ tổng quan hiển thị sẵn; bấm vào mở các biểu đồ còn lại. */}
          <DetailGroupCard
            title='Doanh thu theo ngày'
            subtitle='Bấm để xem cơ cấu, theo dịch vụ và thanh toán'
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
        <div className='grid gap-4 lg:grid-cols-3'>
          <Panel
            title='Cơ cấu doanh thu'
            hint='Net = Gộp − Giảm giá − Hoàn tiền'
          >
            <dl className='flex flex-col gap-3 text-sm'>
              <RevenueRow label='Doanh thu gộp' value={revenue.gross} />
              <RevenueRow
                label='Giảm giá'
                value={-revenue.discount}
                tone='warning'
              />
              <RevenueRow
                label='Hoàn tiền'
                value={-revenue.refund}
                tone='destructive'
              />
              <div className='mt-1 flex items-center justify-between border-t border-border pt-3'>
                <dt className='font-semibold text-foreground'>
                  Doanh thu thực nhận
                </dt>
                <dd className='font-heading text-lg font-bold text-success'>
                  {formatCurrency(revenue.net)}
                </dd>
              </div>
              <div className='flex items-center justify-between text-muted-foreground'>
                <dt>Giá trị đơn trung bình</dt>
                <dd className='tabular-nums'>
                  {formatCurrency(revenue.averageOrderValue)}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title='Tỷ trọng doanh thu theo dịch vụ'>
            <DonutChart
              data={revenue.byService.map((s) => ({
                label: s.name,
                value: s.revenue,
              }))}
              formatValue={formatCurrency}
              centerCaption='doanh thu'
              emptyMessage='Chưa có doanh thu theo dịch vụ trong khoảng thời gian này'
            />
          </Panel>

          <Panel title='Tỷ trọng theo phương thức thanh toán'>
            <DonutChart
              data={revenue.byPaymentMethod.map((r) => ({
                label: PAYMENT_LABELS[r.name] ?? r.name,
                value: r.revenue,
              }))}
              formatValue={formatCurrency}
              centerCaption='doanh thu'
              emptyMessage='Chưa có doanh thu trong khoảng thời gian này'
            />
          </Panel>
        </div>

          </DetailGroupCard>

          <DetailGroupCard
            title='Tình hình đặt lịch'
            subtitle='Bấm để xem tỷ lệ, khung giờ và theo dịch vụ'
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
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
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
                emptyMessage='Chưa có đặt lịch trong kỳ này'
              />
            </Panel>
            <Panel title='Đặt lịch theo dịch vụ'>
              <BarList
                items={bookings.byService.map((s) => ({
                  label: s.name,
                  value: s.count,
                }))}
                format={(v) => `${formatNumber(v)} đơn`}
                emptyMessage='Chưa có đặt lịch trong kỳ này'
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
                href='/admin/washers'
                className='text-xs font-semibold text-primary hover:underline'
              >
                Xem giám sát trực tiếp →
              </Link>
            </div>
        <Panel title='Top thợ rửa theo số việc hoàn thành'>
          <RankingTable
            rows={washers}
            rowKey={(w) => w.id}
            emptyMessage='Chưa có thợ nào hoàn thành lượt rửa trong kỳ này'
            columns={[
              {
                header: '#',
                cell: (_w, i) => <RankBadge index={i} />,
              },
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
                      : '-'}
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
              {
                header: 'Doanh thu xử lý',
                align: 'right',
                cell: (w) => (
                  <span className='font-medium tabular-nums'>
                    {formatCurrency(w.revenueHandled)}
                  </span>
                ),
              },
            ]}
          />
        </Panel>
          </DetailGroupCard>

          <DetailGroupCard
            title='Khách hàng'
            subtitle='Bấm để xem giữ chân, hạng và top khách'
            icon={Users}
            preview={
              <DonutChart
                data={[
                  { label: 'Khách mới', value: customers.newCustomers },
                  {
                    label: 'Khách quay lại',
                    value: customers.returningCustomers,
                  },
                ]}
                centerCaption='khách'
                emptyMessage='Chưa có khách nào trong khoảng thời gian này'
              />
            }
          >
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <KpiCard
                label='Khách mới'
                value={formatNumber(customers.newCustomers)}
                icon={Users}
                tone='primary'
              />
              <KpiCard
                label='Khách quay lại'
                value={formatNumber(customers.returningCustomers)}
                icon={Users}
                tone='success'
              />
              <KpiCard
                label='Tỷ lệ giữ chân'
                value={formatPercent(customers.retentionRate)}
                icon={Users}
              />
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
              <Panel title='Phân bố hạng thành viên'>
                <BarList
                  items={customers.tierDistribution.map((t) => ({
                    label: t.name,
                    value: t.count,
                  }))}
                  format={(v) => `${formatNumber(v)} khách`}
                  emptyMessage='Chưa có dữ liệu hạng thành viên'
                />
              </Panel>
              <Panel title='Top khách theo chi tiêu'>
                <BarList
                  items={customers.topBySpending.map((c) => ({
                    label: c.name,
                    value: c.value,
                  }))}
                  format={formatCurrency}
                  emptyMessage='Chưa có chi tiêu trong khoảng thời gian này'
                  accent='bg-success'
                />
              </Panel>
            </div>
          </DetailGroupCard>

          <DetailGroupCard
            title='Dịch vụ & Phương tiện'
            subtitle='Bấm để xem doanh thu theo dịch vụ và loại xe'
            icon={Layers}
            preview={
              <BarList
                items={services.mostUsed.slice(0, 5).map((s) => ({
                  label: s.name,
                  value: s.count,
                }))}
                format={(v) => `${formatNumber(v)} đơn`}
                emptyMessage='Chưa có đặt lịch trong khoảng thời gian này'
              />
            }
          >
            <div className='grid gap-4 lg:grid-cols-2'>
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
            </div>
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
                variant='admin'
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

/* ─── Small helpers ───────────────────────────────────────────────────── */

function RevenueRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'warning' | 'destructive';
}) {
  // Normalise -0 so a zero deduction never renders as "-0 ₫".
  const display = value === 0 ? 0 : value;
  return (
    <div className='flex items-center justify-between'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd
        className={`tabular-nums ${
          tone === 'warning'
            ? 'text-warning'
            : tone === 'destructive'
              ? 'text-destructive'
              : 'text-foreground'
        }`}
      >
        {formatCurrency(display)}
      </dd>
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
      <div className='grid gap-4 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='h-64 animate-pulse rounded-xl border border-border bg-muted/40'
          />
        ))}
      </div>
    </div>
  );
}
