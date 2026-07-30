'use client';

import { Search, ChevronDown, Table2, LayoutGrid, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  ShiftStatusKey,
  DateRangeKey,
  SortKey,
} from '@/lib/shift-helpers';

export type StatusFilter = ShiftStatusKey | 'all';
export type ShiftView = 'table' | 'card';

type ShiftToolbarProps = {
  search: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  dateRange: DateRangeKey;
  onDateRangeChange: (v: DateRangeKey) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  view: ShiftView;
  onViewChange: (v: ShiftView) => void;
  resultCount: number;
  totalCount: number;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang diễn ra' },
  { value: 'upcoming', label: 'Sắp tới' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const DATE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'all', label: 'Mọi thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'latest', label: 'Ngày mới nhất' },
  { value: 'soonest', label: 'Sắp diễn ra trước' },
  { value: 'capacity', label: 'Sắp đầy chỗ trước' },
  { value: 'newest', label: 'Mới tạo trước' },
];

const selectCls =
  'h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-9 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/30 cursor-pointer';

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className='relative'>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={selectCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className='pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
    </div>
  );
}

export function ShiftToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  resultCount,
  totalCount,
}: ShiftToolbarProps) {
  return (
    <div className='sticky top-0 z-20 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
        {/* Search */}
        <div className='relative flex-1 lg:max-w-xs'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <input
            type='text'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Tìm nhân viên, vai trò, địa điểm…'
            aria-label='Tìm kiếm ca làm việc'
            className='h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-placeholder focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/30'
          />
          {search && (
            <button
              type='button'
              onClick={() => onSearchChange('')}
              aria-label='Xoá tìm kiếm'
              className='absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
            >
              <X className='size-3.5' />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1 lg:flex-wrap'>
          <FilterSelect
            label='Lọc theo trạng thái'
            value={status}
            onChange={onStatusChange}
            options={STATUS_OPTIONS}
          />
          <FilterSelect
            label='Lọc theo thời gian'
            value={dateRange}
            onChange={onDateRangeChange}
            options={DATE_OPTIONS}
          />
          <FilterSelect
            label='Sắp xếp'
            value={sort}
            onChange={onSortChange}
            options={SORT_OPTIONS}
          />
        </div>

        {/* View toggle */}
        <div
          role='group'
          aria-label='Chế độ xem'
          className='flex shrink-0 items-center rounded-lg border border-border bg-muted/40 p-0.5'
        >
          <button
            type='button'
            onClick={() => onViewChange('table')}
            aria-pressed={view === 'table'}
            title='Xem dạng bảng'
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              view === 'table'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Table2 className='size-4' />
            <span className='hidden sm:inline'>Bảng</span>
          </button>
          <button
            type='button'
            onClick={() => onViewChange('card')}
            aria-pressed={view === 'card'}
            title='Xem dạng thẻ'
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              view === 'card'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className='size-4' />
            <span className='hidden sm:inline'>Thẻ</span>
          </button>
        </div>
      </div>

      {/* Result count */}
      <p className='mt-2 px-1 text-xs text-muted-foreground'>
        Hiển thị <span className='font-semibold text-foreground'>{resultCount}</span>
        {' / '}
        {totalCount} ca làm việc
      </p>
    </div>
  );
}
