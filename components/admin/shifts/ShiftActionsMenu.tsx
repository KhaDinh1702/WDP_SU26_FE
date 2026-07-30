'use client';

import { MoreVertical, Pencil, Ban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Shift } from '@/lib/shift-helpers';

type ShiftActionsMenuProps = {
  shift: Shift;
  onEdit: (shift: Shift) => void;
  /** Mở modal xác nhận trước khi hủy ca (thao tác nguy hiểm). */
  onCancelRequest: (shift: Shift) => void;
};

/**
 * Menu thao tác dạng dấu ba chấm — chỉ còn Sửa / Hủy ca.
 * Trạng thái ca (active/completed) do BE tự chuyển theo thời gian,
 * không còn thao tác "bắt đầu / hoàn thành" thủ công.
 */
export function ShiftActionsMenu({
  shift,
  onEdit,
  onCancelRequest,
}: ShiftActionsMenuProps) {
  const raw = shift.status;
  const isClosed = raw === 'cancelled' || raw === 'completed';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Mở menu thao tác ca'
          title='Thao tác'
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {isClosed ? (
          <DropdownMenuItem disabled>Không có thao tác</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => onEdit(shift)}>
              <Pencil />
              Sửa ca
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant='destructive'
              onSelect={() => onCancelRequest(shift)}
            >
              <Ban />
              Hủy ca
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
