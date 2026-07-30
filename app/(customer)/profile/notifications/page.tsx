'use client';

import { useState } from 'react';
import { Bell, Check, RefreshCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/customer-api';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import {
  NOTI_META,
  fallbackMeta,
  timeAgo,
} from '@/components/notifications/notification-meta';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/getErrorMessage';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useNotifications(page, 20);
  const items = data?.data ?? [];
  const meta = data?.meta;
  const unread = data?.unread ?? 0;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['notifications'] }).then(() =>
      qc.invalidateQueries({ queryKey: ['notifications-unread'] }),
    );

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
    onError: (error) =>
      toast.error('Không thể đánh dấu thông báo.', {
        description: getErrorMessage(error),
      }),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
    onError: (error) =>
      toast.error('Không thể đánh dấu tất cả thông báo.', {
        description: getErrorMessage(error),
      }),
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='font-heading text-2xl font-semibold text-foreground flex items-center gap-2'>
            <Bell className='w-7 h-7 text-primary' /> Thông báo
          </h1>
          <p className='text-sm text-muted-foreground'>
            Cập nhật về đơn đặt lịch và tiến trình rửa xe của bạn.
          </p>
        </div>
        {unread > 0 && (
          <button
            type='button'
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending}
            className='inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:w-auto'
          >
            <Check className='h-4 w-4' /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {isLoading ? (
        <div className='flex flex-col items-center justify-center min-h-75 gap-3'>
          <Spinner className='size-8 text-primary' />
          <p className='text-sm text-muted-foreground'>Đang tải thông báo...</p>
        </div>
      ) : isError ? (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center'>
          <Bell className='size-8 text-destructive' />
          <h2 className='mt-3 font-heading text-lg font-bold text-foreground'>
            Chưa thể tải thông báo
          </h2>
          <p className='mt-1 max-w-md text-sm text-muted-foreground'>
            Kết nối đang gặp sự cố. Bạn có thể thử tải lại dữ liệu.
          </p>
          <button
            type='button'
            onClick={() => refetch()}
            className='mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted'
          >
            <RefreshCcw className='size-4' /> Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title='Chưa có thông báo nào'
          description='Khi có cập nhật về đơn đặt lịch hoặc quá trình rửa xe, thông báo sẽ xuất hiện ở đây.'
        />
      ) : (
        <>
          <ul className='divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_18px_45px_-38px_rgba(30,58,138,0.55)]'>
            {items.map((n) => {
              const m = NOTI_META[n.type] ?? fallbackMeta;
              const Icon = m.icon;
              return (
                <li key={n.id}>
                  <button
                    type='button'
                    onClick={() => {
                      if (!n.isRead) readOne.mutate(n.id);
                    }}
                    disabled={readOne.isPending && readOne.variables === n.id}
                    className={cn(
                      'flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70 sm:px-5',
                      !n.isRead && 'bg-accent/40',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        m.tone,
                      )}
                    >
                      <Icon className='h-4 w-4' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='flex items-center gap-2'>
                        <span className='text-sm font-semibold text-foreground'>
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-primary' />
                        )}
                      </span>
                      <span className='mt-0.5 block text-sm text-muted-foreground'>
                        {n.body}
                      </span>
                      <span className='mt-1 block text-[11px] text-placeholder'>
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {meta && meta.totalPages > 1 && (
            <div className='flex items-center justify-between text-sm text-muted-foreground'>
              <span>
                Trang {meta.page}/{meta.totalPages} · {meta.total} thông báo
              </span>
              <div className='flex gap-2'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className='rounded-lg border border-border bg-card px-3 py-1.5 font-medium disabled:opacity-40'
                >
                  Trước
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page >= meta.totalPages}
                  className='rounded-lg border border-border bg-card px-3 py-1.5 font-medium disabled:opacity-40'
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
