'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  getShiftId,
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

type ShiftTableProps = {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
  onCancelRequest: (shift: Shift) => void;
};

export function ShiftTable({
  shifts,
  onEdit,
  onCancelRequest,
}: ShiftTableProps) {
  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50 hover:bg-muted/50'>
            <TableHead className='pl-4'>Thời gian</TableHead>
            <TableHead>Sức chứa</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className='pr-3 text-right'>
              <span className='sr-only'>Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const id = getShiftId(shift);
            const status = getShiftStatus(shift);
            const meta = STATUS_META[status];
            const needsAttention = shiftNeedsAttention(shift);
            const isClosed = status === 'cancelled' || status === 'completed';
            const duration = formatDuration(shift.startAt, shift.endAt);

            return (
              <TableRow
                key={id}
                className={cn(
                  needsAttention && 'bg-warning/[0.04]',
                  isClosed && 'opacity-65',
                )}
              >
                {/* Thời gian — cột đầu, giữ vạch màu cảnh báo của hàng */}
                <TableCell
                  className={cn(
                    'border-l-4 border-l-transparent pl-4',
                    needsAttention && meta.accentBorder,
                  )}
                >
                  <div className='text-sm font-medium text-foreground'>
                    {formatTimeRange(shift.startAt, shift.endAt)}
                  </div>
                  {duration && (
                    <div className='mt-0.5 text-xs text-muted-foreground'>{duration}</div>
                  )}
                </TableCell>

                {/* Sức chứa */}
                <TableCell>
                  <ShiftCapacityBar shift={shift} />
                </TableCell>

                {/* Trạng thái */}
                <TableCell>
                  <ShiftStatusBadge status={status} />
                </TableCell>

                {/* Thao tác */}
                <TableCell className='pr-3 text-right'>
                  <ShiftActionsMenu
                    shift={shift}
                    onEdit={onEdit}
                    onCancelRequest={onCancelRequest}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
