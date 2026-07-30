'use client';

import { useSocketEvent } from '@/hooks/useSocketEvent';
import { adminGetWasherStatus } from '@/lib/admin-api';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { WasherLiveStatus } from '@/types/washer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Khối theo dõi thợ thu gọn cho dashboard tổng: đếm thợ theo nhóm hành vi
 * (đang rửa / đã nhận xe / rảnh / trong ca). Tự cập nhật qua socket wash:*
 * — bản đầy đủ nằm ở trang Giám sát thợ rửa (`href`).
 */
export function WasherStatusMini({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['washer-status'],
    queryFn: () => adminGetWasherStatus(),
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
    inProgress: washers.filter((w) => w.status === 'in_progress').length,
    assigned: washers.filter((w) => w.status === 'assigned').length,
    free: washers.filter((w) => w.status === 'free').length,
    onShift: washers.filter((w) => w.onShift).length,
  };

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col gap-3',
        className,
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm font-semibold text-foreground'>
          Thợ rửa xe lúc này
        </p>
        <Link
          href={href}
          className='inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0'
        >
          Xem chi tiết <ArrowRight className='w-3 h-3' />
        </Link>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-5 animate-pulse rounded-md bg-muted' />
          ))}
        </div>
      ) : washers.length === 0 ? (
        <p className='py-3 text-sm text-muted-foreground'>
          Chưa có thợ nào đang hoạt động.
        </p>
      ) : (
        <ul className='flex flex-1 flex-col justify-center gap-2 text-sm'>
          <StatusRow
            dot='bg-success'
            label='Đang rửa'
            value={counts.inProgress}
          />
          <StatusRow
            dot='bg-warning'
            label='Đã nhận xe'
            value={counts.assigned}
          />
          <StatusRow dot='bg-muted-foreground/40' label='Rảnh' value={counts.free} />
          <li className='mt-1 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground'>
            <span>Trong ca hôm nay</span>
            <span className='font-semibold text-foreground tabular-nums'>
              {formatNumber(counts.onShift)}/{formatNumber(washers.length)}
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

function StatusRow({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: number;
}) {
  return (
    <li className='flex items-center justify-between'>
      <span className='flex items-center gap-2 text-muted-foreground'>
        <span className={cn('size-2 rounded-full', dot)} />
        {label}
      </span>
      <span className='font-semibold text-foreground tabular-nums'>
        {formatNumber(value)}
      </span>
    </li>
  );
}
