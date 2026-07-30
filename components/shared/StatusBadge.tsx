import { Check, Clock, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatusTone } from '@/constants';

/**
 * Mỗi tông có một dấu hiệu mang nghĩa thay cho chấm tròn chung chung: kết thúc rõ
 * ràng dùng glyph (✓ xong, ✕ huỷ, đồng hồ = đang chờ), trạng thái đang chạy dùng
 * chấm nhấp nháy, còn lại là chấm tĩnh. `chip` gộp nền + chữ + viền mảnh cùng tông.
 */
type Marker = { icon?: LucideIcon; pulse?: boolean };

const TONE_STYLE: Record<StatusTone, { chip: string; marker: Marker }> = {
  primary: {
    chip: 'bg-primary/10 text-primary border-primary/25',
    marker: { pulse: true },
  },
  info: {
    chip: 'bg-info/10 text-info border-info/30',
    marker: {},
  },
  success: {
    chip: 'bg-success/10 text-success border-success/30',
    marker: { icon: Check },
  },
  warning: {
    chip: 'bg-warning/15 text-warning border-warning/40',
    marker: { icon: Clock },
  },
  destructive: {
    chip: 'bg-destructive/10 text-destructive border-destructive/30',
    marker: { icon: X },
  },
  muted: {
    chip: 'bg-muted text-muted-foreground border-border',
    marker: {},
  },
};

type StatusBadgeProps = {
  /** Nhãn hiển thị, ví dụ "Hoàn thành". */
  label: string;
  /** Tông màu - lấy từ `*_STATUS_META` trong constants. */
  tone?: StatusTone;
  /** Hiện dấu hiệu (glyph/chấm) phía trước. */
  withDot?: boolean;
  className?: string;
};

/**
 * Badge trạng thái dùng chung cho mọi loại status (order, payment, work-order…).
 * Mọi màu trạng thái trong app phải đi qua component này để đồng nhất.
 */
export function StatusBadge({
  label,
  tone = 'muted',
  withDot = true,
  className,
}: StatusBadgeProps) {
  const { chip, marker } = TONE_STYLE[tone];
  const Icon = marker.icon;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        chip,
        className,
      )}
    >
      {withDot &&
        (Icon ? (
          <Icon className='size-3' strokeWidth={2.75} aria-hidden />
        ) : (
          <span
            className={cn(
              'size-1.5 rounded-full bg-current',
              marker.pulse && 'animate-pulse',
            )}
            aria-hidden
          />
        ))}
      {label}
    </span>
  );
}
