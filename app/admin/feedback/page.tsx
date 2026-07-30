'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Pagination } from '@/components/shared/Pagination';
import { StarRating } from '@/components/shared/StarRating';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  adminGetFeedback,
  adminGetWasherFeedbackSummary,
  adminGetWasherStatus,
} from '@/lib/admin-api';
import { formatDateTime, formatLicensePlate } from '@/lib/format';
import type { WasherFeedbackItem } from '@/types/washer';
import { useQuery } from '@tanstack/react-query';
import { Car, MessageSquareText, RefreshCw, Star, UserRound } from 'lucide-react';
import { useState } from 'react';

const PAGE_SIZE = 10;

/** Giá trị của bộ lọc khi không giới hạn theo thợ nào. */
const ALL_WASHERS = 'all';

/**
 * Đánh giá khách hàng gửi sau mỗi lượt rửa (admin/manager).
 *
 * BE chỉ có endpoint tổng hợp điểm theo TỪNG thợ
 * (`/admin/feedback/washers/:id/summary`), không có bản tổng hợp toàn hệ thống,
 * nên thẻ điểm trung bình chỉ hiện khi đã chọn một thợ cụ thể - không tự tính
 * trung bình từ dữ liệu một trang vì con số đó sẽ sai.
 */
export default function AdminFeedbackPage() {
  const [washerId, setWasherId] = useState<string>(ALL_WASHERS);
  const [page, setPage] = useState(1);

  // Danh sách thợ cho bộ lọc. Dùng bảng giám sát thợ vì endpoint này cho phép
  // cả manager, khác với /admin/users chỉ admin gọi được.
  const { data: washersRes } = useQuery({
    queryKey: ['admin-washer-status'],
    queryFn: () => adminGetWasherStatus(),
  });
  const washers = washersRes?.data ?? [];

  const {
    data: listRes,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-feedback', washerId, page],
    queryFn: () =>
      adminGetFeedback({
        page,
        limit: PAGE_SIZE,
        ...(washerId !== ALL_WASHERS ? { washerId } : {}),
      }),
  });

  const { data: summaryRes } = useQuery({
    queryKey: ['admin-feedback-summary', washerId],
    queryFn: () => adminGetWasherFeedbackSummary(washerId),
    enabled: washerId !== ALL_WASHERS,
  });

  const items: WasherFeedbackItem[] = listRes?.data?.data ?? [];
  const meta = listRes?.data?.meta;
  const summary = summaryRes?.data;
  const maxDistribution = summary
    ? Math.max(1, ...Object.values(summary.distribution))
    : 1;

  const selectedWasherName = washers.find(
    (w) => w.washerId === washerId,
  )?.name;

  return (
    <>
      <AdminTopbar
        title='Đánh giá của khách hàng'
        subtitle='Điểm sao và nhận xét khách gửi sau mỗi lượt rửa'
      />
      <main className='flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto flex max-w-4xl flex-col gap-5'>
          {/* Bộ lọc */}
          <div className='flex flex-wrap items-center gap-3'>
            <label
              htmlFor='feedback-washer-filter'
              className='text-xs font-semibold text-muted-foreground'
            >
              Lọc theo thợ rửa
            </label>
            <select
              id='feedback-washer-filter'
              value={washerId}
              onChange={(e) => {
                setWasherId(e.target.value);
                setPage(1);
              }}
              className='min-w-52 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <option value={ALL_WASHERS}>Tất cả thợ</option>
              {washers.map((w) => (
                <option key={w.washerId} value={w.washerId}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => refetch()}
              title='Tải lại'
              className='ml-auto rounded-xl border border-border bg-card p-2.5 text-foreground/60 hover:bg-muted'
            >
              <RefreshCw
                className={`size-4 ${isRefetching ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Điểm tổng hợp - chỉ có khi lọc theo một thợ cụ thể */}
          {washerId !== ALL_WASHERS && (
            <Card className='py-5'>
              <CardContent className='grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]'>
                <div className='flex flex-col items-center justify-center gap-2 text-center'>
                  <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground'>
                    <UserRound className='size-3.5' />
                    {selectedWasherName ?? 'Thợ rửa'}
                  </span>
                  <span className='font-heading text-5xl font-bold text-foreground'>
                    {(summary?.averageRating ?? 0).toFixed(1)}
                  </span>
                  <StarRating rating={Math.round(summary?.averageRating ?? 0)} />
                  <span className='text-sm text-muted-foreground'>
                    {summary?.count ?? 0} lượt đánh giá
                  </span>
                </div>
                <div className='flex flex-col justify-center gap-1.5'>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary?.distribution?.[String(star)] ?? 0;
                    return (
                      <div
                        key={star}
                        className='flex items-center gap-2 text-sm'
                      >
                        <span className='w-3 text-right font-medium text-foreground'>
                          {star}
                        </span>
                        <Star className='size-3.5 fill-warning text-warning' />
                        <div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
                          <div
                            className='h-full rounded-full bg-warning'
                            style={{
                              width: `${(count / maxDistribution) * 100}%`,
                            }}
                          />
                        </div>
                        <span className='w-8 text-xs text-muted-foreground'>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Danh sách nhận xét */}
          {isLoading ? (
            <div className='space-y-3'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-24 rounded-xl' />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center gap-2 py-12 text-center'>
                <MessageSquareText className='size-8 text-muted-foreground/50' />
                <p className='font-medium text-foreground'>
                  Chưa có đánh giá nào
                </p>
                <p className='text-sm text-muted-foreground'>
                  {washerId === ALL_WASHERS
                    ? 'Khi khách chấm sao cho một lượt rửa, đánh giá sẽ hiện ở đây.'
                    : 'Thợ này chưa nhận đánh giá nào từ khách.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-3'>
              <p className='text-xs font-medium text-muted-foreground'>
                {meta?.total ?? items.length} đánh giá
              </p>

              {items.map((fb) => (
                <Card key={fb.id} className='py-4'>
                  <CardContent className='space-y-2'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='flex items-center gap-2'>
                        <StarRating rating={fb.rating} />
                        <span className='text-sm font-medium text-foreground'>
                          {fb.customerName ?? 'Khách hàng'}
                        </span>
                      </div>
                      <span className='text-xs text-muted-foreground'>
                        {formatDateTime(fb.createdAt)}
                      </span>
                    </div>

                    {fb.comment && (
                      <p className='text-sm leading-6 text-foreground'>
                        {fb.comment}
                      </p>
                    )}

                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                      {/* Admin xem chéo nhiều thợ nên luôn hiện tên thợ bị chấm điểm. */}
                      {fb.washerName && (
                        <span className='inline-flex items-center gap-1.5 font-semibold text-foreground/70'>
                          <UserRound className='size-3.5' /> {fb.washerName}
                        </span>
                      )}
                      {(fb.vehiclePlate || fb.workOrderCode) && (
                        <span className='inline-flex items-center gap-1.5'>
                          <Car className='size-3.5' />
                          {fb.vehiclePlate
                            ? formatLicensePlate(fb.vehiclePlate)
                            : ''}
                          {fb.vehiclePlate && fb.workOrderCode ? ' · ' : ''}
                          {fb.workOrderCode ? `Phiếu ${fb.workOrderCode}` : ''}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {meta && meta.totalPages > 1 && (
                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                  className='pt-2'
                />
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
