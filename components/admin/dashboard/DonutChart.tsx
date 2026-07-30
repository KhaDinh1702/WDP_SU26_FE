'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercent } from '@/lib/format';
import { EmptyBlock } from './parts';

export interface DonutDatum {
  label: string;
  value: number;
}

/** Distinct, muted palette - readable side by side, never neon. */
const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];
const OTHER_COLOR = '#94a3b8'; // slate - reserved for the grouped "Khác" slice

interface DonutChartProps {
  data: DonutDatum[];
  /** Message shown when there is nothing to plot (total = 0). */
  emptyMessage: string;
  /** Formats the raw value in legend + tooltip (count by default). */
  formatValue?: (v: number) => string;
  /** Slices beyond this are folded into a single "Khác" slice. */
  maxSlices?: number;
  /** Small caption under the donut centre (e.g. "đơn", "lượt"). */
  centerCaption?: string;
}

interface Slice extends DonutDatum {
  color: string;
  pct: number;
}

export function DonutChart({
  data,
  emptyMessage,
  formatValue = (v) => formatNumber(v),
  maxSlices = 7,
  centerCaption,
}: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const positives = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = positives.reduce((s, d) => s + d.value, 0);

  if (total <= 0) return <EmptyBlock message={emptyMessage} />;

  // Fold the long tail into a single grey "Khác" slice.
  let grouped: DonutDatum[] = positives;
  if (positives.length > maxSlices) {
    const head = positives.slice(0, maxSlices - 1);
    const tail = positives.slice(maxSlices - 1);
    const rest = tail.reduce((s, d) => s + d.value, 0);
    grouped = [...head, { label: 'Khác', value: rest }];
  }

  const slices: Slice[] = grouped.map((d, i) => ({
    ...d,
    pct: (d.value / total) * 100,
    color:
      d.label === 'Khác' && i === grouped.length - 1
        ? OTHER_COLOR
        : PALETTE[i % PALETTE.length],
  }));

  // Donut geometry. Pre-compute each slice's arc length and the cumulative
  // start offset so the render pass stays free of mutation.
  const size = 168;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const lengths = slices.map((s) => (s.pct / 100) * c);
  const offsets = lengths.map((_, i) =>
    lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
  );

  const activeSlice = active != null ? slices[active] : null;

  return (
    // Adapt to the *panel* width (not the viewport): stack donut over legend in
    // narrow columns, sit side-by-side only when the panel is wide enough.
    <div className='@container'>
    <div className='mx-auto flex w-full max-w-md flex-col items-center gap-5 @md:flex-row @md:justify-center @md:gap-6'>
      {/* Donut */}
      <div
        className='relative shrink-0'
        style={{ width: size, height: size }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => {
          setActive(null);
          setPos(null);
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role='img'
        >
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {slices.map((s, i) => {
              const len = lengths[i];
              const dash = `${len} ${c - len}`;
              const dashOffset = -offsets[i];
              const dim = active != null && active !== i;
              return (
                <circle
                  key={`${s.label}-${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill='none'
                  stroke={s.color}
                  strokeWidth={active === i ? stroke + 4 : stroke}
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  className='cursor-pointer transition-[stroke-width,opacity] duration-150'
                  style={{ opacity: dim ? 0.4 : 1 }}
                  onMouseEnter={() => setActive(i)}
                />
              );
            })}
          </g>
        </svg>

        {/* Centre label */}
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
          {activeSlice ? (
            <>
              <span className='font-heading text-lg font-bold text-foreground'>
                {formatPercent(Math.round(activeSlice.pct * 10) / 10)}
              </span>
              <span className='max-w-24 truncate text-[11px] text-muted-foreground'>
                {activeSlice.label}
              </span>
            </>
          ) : (
            <>
              <span className='max-w-24 text-center font-heading text-base font-bold leading-tight text-foreground'>
                {formatValue(total)}
              </span>
              {centerCaption && (
                <span className='text-[11px] text-muted-foreground'>
                  {centerCaption}
                </span>
              )}
            </>
          )}
        </div>

        {/* Tooltip */}
        {activeSlice && pos && (
          <div
            className='pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md'
            style={{ left: pos.x, top: pos.y - 8 }}
          >
            <div className='flex items-center gap-1.5'>
              <span
                className='size-2 rounded-full'
                style={{ backgroundColor: activeSlice.color }}
              />
              <span className='font-medium text-foreground'>
                {activeSlice.label}
              </span>
            </div>
            <div className='mt-0.5 text-muted-foreground'>
              {formatValue(activeSlice.value)} ·{' '}
              {formatPercent(Math.round(activeSlice.pct * 10) / 10)}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <ul className='flex w-full flex-col gap-2 @md:w-64 @md:shrink-0'>
        {slices.map((s, i) => (
          <li
            key={`${s.label}-legend-${i}`}
            className={cn(
              'flex items-center justify-between gap-3 rounded-md px-1.5 py-1 text-sm transition-colors',
              active === i && 'bg-muted',
            )}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className='flex min-w-0 items-center gap-2'>
              <span
                className='size-2.5 shrink-0 rounded-full'
                style={{ backgroundColor: s.color }}
              />
              <span className='truncate text-foreground'>{s.label}</span>
            </span>
            <span className='shrink-0 tabular-nums text-muted-foreground'>
              {formatValue(s.value)}
              <span className='ml-1.5 text-foreground/80'>
                {formatPercent(Math.round(s.pct * 10) / 10)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
