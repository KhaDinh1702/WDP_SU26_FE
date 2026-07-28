'use client';

import { adminGetWasherStatus } from '@/lib/admin-api';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import type { WasherLiveStatus, WasherWorkStatus } from '@/types/washer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Car, Clock, RefreshCw, Timer, Wrench } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const STATUS_META: Record<
  WasherWorkStatus,
  { label: string; variant: 'success' | 'warning' | 'muted' }
> = {
  in_progress: { label: 'Đang rửa', variant: 'success' },
  assigned: { label: 'Đã nhận xe', variant: 'warning' },
  free: { label: 'Rảnh', variant: 'muted' },
};

/** Số phút đã trôi qua kể từ `iso` (làm tròn xuống, tối thiểu 0). */
function elapsedMinutes(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/**
 * Bảng giám sát thợ realtime cho admin/manager: ai đang rửa xe nào, ai rảnh,
 * ai trong ca. Tự refetch khi có sự kiện wash:* qua socket (đã emit tới ops).
 */
export function WasherStatusBoard() {
  const qc = useQueryClient();
  // Đồng hồ phút cho "đang rửa được X phút" — tick 30s là đủ mịn.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['washer-status'],
    queryFn: () => adminGetWasherStatus(),
    // Socket là nguồn chính; polling 60s làm lưới an toàn khi rớt kết nối.
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['washer-status'] });
  };
  useSocketEvent('wash:assigned', invalidate);
  useSocketEvent('wash:started', invalidate);
  useSocketEvent('wash:completed', invalidate);

  const washers: WasherLiveStatus[] = data?.data ?? [];
  const counts = {
    in_progress: washers.filter((w) => w.status === 'in_progress').length,
    assigned: washers.filter((w) => w.status === 'assigned').length,
    free: washers.filter((w) => w.status === 'free').length,
    onShift: washers.filter((w) => w.onShift).length,
  };

  return (
    <div className='space-y-4'>
      {/* Thanh tổng hợp + refresh */}
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='success'>Đang rửa: {counts.in_progress}</Badge>
        <Badge variant='warning'>Đã nhận xe: {counts.assigned}</Badge>
        <Badge variant='muted'>Rảnh: {counts.free}</Badge>
        <Badge variant='info'>Trong ca: {counts.onShift}/{washers.length}</Badge>
        <div className='ml-auto flex items-center gap-2 text-xs text-muted-foreground'>
          {dataUpdatedAt > 0 && (
            <span>
              Cập nhật {new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            type='button'
            onClick={() => void refetch()}
            className='inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted transition-colors'
            aria-label='Làm mới'
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-40 rounded-xl' />
          ))}
        </div>
      ) : washers.length === 0 ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-muted-foreground'>
            Chưa có thợ rửa xe nào đang hoạt động.
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {washers.map((w) => {
            const meta = STATUS_META[w.status];
            const wo = w.currentWorkOrder;
            return (
              <Card key={w.washerId} className='gap-4 py-4'>
                <CardContent className='space-y-3'>
                  {/* Hàng nhận diện thợ */}
                  <div className='flex items-center gap-3'>
                    {w.avatarUrl ? (
                      <Image
                        src={w.avatarUrl}
                        alt={w.name}
                        width={40}
                        height={40}
                        className='size-10 rounded-full object-cover'
                      />
                    ) : (
                      <div className='flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                        {initials(w.name) || '?'}
                      </div>
                    )}
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium text-foreground'>
                        {w.name}
                      </p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {w.email}
                      </p>
                    </div>
                  </div>

                  {/* Trạng thái + ca */}
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <Badge variant={w.onShift ? 'info' : 'outline'}>
                      <Clock />
                      {w.onShift ? 'Trong ca' : 'Ngoài ca'}
                    </Badge>
                  </div>

                  {/* Phiếu đang làm */}
                  {wo ? (
                    <div className='space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm'>
                      <div className='flex items-center gap-2 font-medium text-foreground'>
                        <Car className='size-4 shrink-0 text-primary' />
                        <span className='truncate'>
                          {wo.plate}
                          {wo.vehicleTypeName ? ` · ${wo.vehicleTypeName}` : ''}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Wrench className='size-4 shrink-0' />
                        <span className='truncate'>{wo.serviceName}</span>
                      </div>
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Timer className='size-4 shrink-0' />
                        {wo.status === 'in_progress' && wo.startedAt ? (
                          <span>
                            Đang rửa được{' '}
                            <span className='font-medium text-foreground'>
                              {elapsedMinutes(wo.startedAt, now)} phút
                            </span>{' '}
                            / dự kiến {wo.estimatedMinutes} phút
                          </span>
                        ) : (
                          <span>
                            Chưa bắt đầu · dự kiến {wo.estimatedMinutes} phút
                          </span>
                        )}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Mã phiếu: {wo.code}
                        {wo.stationName ? ` · ${wo.stationName}` : ''}
                      </p>
                    </div>
                  ) : (
                    <div className='rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground'>
                      Không có xe nào đang chờ — sẵn sàng nhận việc.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
