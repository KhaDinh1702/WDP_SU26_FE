'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatLicensePlate } from '@/lib/format';
import { washerGetFeedback, washerGetFeedbackSummary } from '@/lib/washer-api';
import type { WasherFeedbackItem } from '@/types/washer';
import { useQuery } from '@tanstack/react-query';
import { Car, MessageSquareText, Star } from 'lucide-react';
import { useState } from 'react';

const PAGE_SIZE = 10;

/** Dãy sao 1-5, tô vàng theo điểm. */
function Stars({ rating, size = 'size-4' }: { rating: number; size?: string }) {
  return (
    <span className='inline-flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating
              ? 'fill-warning text-warning'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Trang "Đánh giá của tôi" cho thợ: điểm trung bình, phân bố sao và danh sách
 * nhận xét khách hàng đã gửi cho các đơn thợ này rửa.
 */
export default function WasherFeedbackPage() {
  const [page, setPage] = useState(1);

  const { data: summaryRes, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['washer-feedback', 'summary'],
    queryFn: () => washerGetFeedbackSummary(),
  });
  const { data: listRes, isLoading: isLoadingList } = useQuery({
    queryKey: ['washer-feedback', 'list', page],
    queryFn: () => washerGetFeedback({ page, limit: PAGE_SIZE }),
  });

  const summary = summaryRes?.data;
  const items: WasherFeedbackItem[] = listRes?.data?.data ?? [];
  const meta = listRes?.data?.meta;
  const maxDistribution = summary
    ? Math.max(1, ...Object.values(summary.distribution))
    : 1;

  return (
    <>
      <AdminTopbar
        title='Đánh giá của tôi'
        subtitle='Nhận xét và điểm sao khách hàng dành cho bạn'
      />
      <main className='flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto flex max-w-4xl flex-col gap-5'>
          {/* Tổng quan điểm */}
          {isLoadingSummary ? (
            <Skeleton className='h-44 rounded-xl' />
          ) : (
            <Card className='py-5'>
              <CardContent className='grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]'>
                <div className='flex flex-col items-center justify-center gap-2 text-center'>
                  <span className='font-heading text-5xl font-bold text-foreground'>
                    {(summary?.averageRating ?? 0).toFixed(1)}
                  </span>
                  <Stars rating={Math.round(summary?.averageRating ?? 0)} />
                  <span className='text-sm text-muted-foreground'>
                    {summary?.count ?? 0} lượt đánh giá
                  </span>
                </div>
                <div className='flex flex-col justify-center gap-1.5'>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary?.distribution?.[String(star)] ?? 0;
                    return (
                      <div key={star} className='flex items-center gap-2 text-sm'>
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
          {isLoadingList ? (
            <div className='space-y-3'>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className='h-24 rounded-xl' />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center gap-2 py-12 text-center'>
                <MessageSquareText className='size-8 text-muted-foreground/50' />
                <p className='font-medium text-foreground'>Chưa có đánh giá nào</p>
                <p className='text-sm text-muted-foreground'>
                  Khi khách chấm sao cho đơn bạn rửa, đánh giá sẽ hiện ở đây.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-3'>
              {items.map((fb) => (
                <Card key={fb.id} className='py-4'>
                  <CardContent className='space-y-2'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='flex items-center gap-2'>
                        <Stars rating={fb.rating} />
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
                    {(fb.vehiclePlate || fb.workOrderCode) && (
                      <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <Car className='size-3.5' />
                        {fb.vehiclePlate
                          ? formatLicensePlate(fb.vehiclePlate)
                          : ''}
                        {fb.vehiclePlate && fb.workOrderCode ? ' · ' : ''}
                        {fb.workOrderCode ? `Phiếu ${fb.workOrderCode}` : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {meta && meta.totalPages > 1 && (
                <div className='flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3'>
                  <span className='text-xs font-semibold text-muted-foreground'>
                    Trang {meta.page} / {meta.totalPages}
                  </span>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className='rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:border-primary/30'
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= meta.totalPages}
                      className='rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:border-primary/30'
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
