import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton dạng bảng — khớp 4 cột của ShiftTable. */
export function ShiftTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <div className='flex h-10 items-center gap-4 border-b border-border bg-muted/50 px-4'>
        {['34%', '26%', '22%', '18%'].map((w, i) => (
          <Skeleton key={i} className='h-3' style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className='flex items-center gap-4 border-b border-border px-4 py-4 last:border-0'
        >
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-3 w-14' />
          </div>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-5 w-20 rounded-md' />
          <Skeleton className='size-8 rounded-md' />
        </div>
      ))}
    </div>
  );
}

/** Skeleton dạng thẻ — khớp lưới ShiftCard. */
export function ShiftCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm'
        >
          <div className='flex items-center justify-between'>
            <Skeleton className='h-5 w-24 rounded-md' />
            <Skeleton className='size-8 rounded-md' />
          </div>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-8 w-full rounded-lg' />
        </div>
      ))}
    </div>
  );
}
