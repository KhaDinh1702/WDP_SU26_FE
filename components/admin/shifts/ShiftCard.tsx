'use client';

import { Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  getShiftStatus,
  formatTimeRange,
  formatDuration,
  shiftNeedsAttention,
  STATUS_META,
  type Shift,
} from '@/lib/shift-helpers';
import { ShiftStatusBadge } from './ShiftStatusBadge';
import { ShiftCapacityBar } from './ShiftCapacityBar';
import { ShiftActionsMenu } from './ShiftActionsMenu';

type ShiftCardProps = {
  shift: Shift;
  onEdit: (shift: Shift) => void;
  onCancelRequest: (shift: Shift) => void;
};

export function ShiftCard({
  shift,
  onEdit,
  onCancelRequest,
}: ShiftCardProps) {
  const status = getShiftStatus(shift);
  const meta = STATUS_META[status];
  const needsAttention = shiftNeedsAttention(shift);
  const isClosed = status === 'cancelled' || status === 'completed';
  const duration = formatDuration(shift.startAt, shift.endAt);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-l-4 border-border border-l-transparent bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        needsAttention && cn('border-warning/40 bg-warning/[0.04]', meta.accentBorder),
        isClosed && 'opacity-70',
      )}
    >
      {/* Top: status + actions */}
      <div className='flex items-start justify-between gap-2'>
        <ShiftStatusBadge status={status} />
        <ShiftActionsMenu
          shift={shift}
          onEdit={onEdit}
          onCancelRequest={onCancelRequest}
        />
      </div>

      {/* Time */}
      <div className='flex items-center gap-2 text-sm text-foreground'>
        <Clock className='size-4 shrink-0 text-muted-foreground' />
        <span>{formatTimeRange(shift.startAt, shift.endAt)}</span>
        {duration && (
          <span className='text-xs text-muted-foreground'>· {duration}</span>
        )}
      </div>

      {/* Capacity */}
      <div className='border-t border-border pt-3'>
        <ShiftCapacityBar shift={shift} className='min-w-0' />
      </div>

      {/* Note (dòng phụ, không nổi bật hơn trạng thái) */}
      {shift.note && (
        <p className='line-clamp-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground'>
          {shift.note}
        </p>
      )}
    </div>
  );
}
