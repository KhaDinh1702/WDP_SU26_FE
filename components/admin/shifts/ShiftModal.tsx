'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Shift } from '@/lib/shift-helpers';

type ShiftModalProps = {
  item?: Shift | null;
  onClose: () => void;
  onSave: (d: Record<string, unknown>) => void;
  isPending?: boolean;
};

type CreateMode = 'single' | 'range';

const fieldLabelCls =
  'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5';
const fieldCls =
  'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/30';
const selectCls = `${fieldCls} cursor-pointer`;

const MS_DAY = 24 * 60 * 60 * 1000;
// Khớp guardrail BE (BulkCreateStaffShiftDto): khoảng tối đa 92 ngày.
const MAX_RANGE_DAYS = 92;

// Thứ theo ISO-8601 để khớp BE: Thứ Hai = 1 … Chủ Nhật = 7.
const WEEKDAYS: Array<{ iso: number; label: string }> = [
  { iso: 1, label: 'T2' },
  { iso: 2, label: 'T3' },
  { iso: 3, label: 'T4' },
  { iso: 4, label: 'T5' },
  { iso: 5, label: 'T6' },
  { iso: 6, label: 'T7' },
  { iso: 7, label: 'CN' },
];

// Giờ cố định của từng block (khớp BUSINESS_HOUR_WINDOWS phía BE).
const BLOCK_HOURS: Record<'morning' | 'afternoon', { start: number; end: number }> = {
  morning: { start: 8, end: 12 },
  afternoon: { start: 14, end: 17 },
};

/** Block đã kết thúc chưa, tính theo ngày được chọn (giờ máy admin ~ giờ VN). */
const isBlockEnded = (dateStr: string, block: 'morning' | 'afternoon') => {
  if (!dateStr) return false;
  const end = new Date(`${dateStr}T00:00:00`);
  end.setHours(BLOCK_HOURS[block].end, 0, 0, 0);
  return end.getTime() <= Date.now();
};

/** Số ngày (inclusive) trong khoảng; 0 nếu ngày không hợp lệ hoặc from > to. */
const rangeDayCount = (from: string, to: string): number => {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  const diff = Math.floor((b - a) / MS_DAY);
  return diff < 0 ? 0 : diff + 1;
};

/** Số ngày thực sự được chọn sau khi lọc theo thứ trong tuần. */
const countSelectedDays = (from: string, to: string, weekdays: number[]): number => {
  const total = rangeDayCount(from, to);
  if (total === 0 || weekdays.length === 0) return 0;
  const base = new Date(`${from}T00:00:00`).getTime();
  let count = 0;
  for (let i = 0; i < total; i++) {
    const dow = new Date(base + i * MS_DAY).getDay();
    if (weekdays.includes(dow === 0 ? 7 : dow)) count += 1;
  }
  return count;
};

// Form tạo/sửa ca theo contract mới: { date, block, capacity?, note? }.
// Chế độ "Nhiều ngày" gửi { fromDate, toDate, block, weekdays, capacity?, note? }
// tới POST /admin/shifts/bulk. Ca không gắn nhân viên/trạm khi tạo — BE tự phân bổ.
export function ShiftModal({ item, onClose, onSave, isPending }: ShiftModalProps) {
  const isEditing = !!item;

  const getBlockFromTimes = (
    startStr?: string,
    endStr?: string,
  ): 'morning' | 'afternoon' | 'fullday' => {
    if (!startStr) return 'morning';
    const date = new Date(startStr);
    const hour = date.getHours();
    if (hour < 12) {
      if (endStr) {
        const endDate = new Date(endStr);
        const endHour = endDate.getHours();
        if (endHour - hour > 6) return 'fullday';
      }
      return 'morning';
    }
    return 'afternoon';
  };

  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const today = formatDateForInput(new Date().toISOString());
  // Ca mới mặc định vào block còn hiệu lực gần nhất của hôm nay.
  const defaultBlock = item
    ? getBlockFromTimes(item.startAt, item.endAt)
    : isBlockEnded(today, 'morning')
      ? 'afternoon'
      : 'morning';

  const initialCapacity = item?.capacity ?? item?.maxBookings;

  // Chế độ tạo: chỉ cho chọn khi tạo mới (sửa ca luôn là 1 ngày).
  const [mode, setMode] = useState<CreateMode>('single');

  const [form, setForm] = useState({
    date: formatDateForInput(item?.startAt) || today,
    fromDate: today,
    toDate: today,
    weekdays: WEEKDAYS.map((w) => w.iso), // mặc định chọn tất cả các thứ
    block: defaultBlock,
    capacity: typeof initialCapacity === 'number' ? String(initialCapacity) : '',
    note: item?.note ?? '',
  });

  const minDate = !item ? today : undefined;

  const toggleWeekday = (iso: number) => {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(iso)
        ? f.weekdays.filter((d) => d !== iso)
        : [...f.weekdays, iso].sort((a, b) => a - b),
    }));
  };

  /** Đọc + validate sức chứa dùng chung cho cả hai chế độ. undefined = bỏ trống. */
  const parseCapacity = (): { ok: boolean; value?: number } => {
    const raw = form.capacity.trim();
    if (raw === '') return { ok: true, value: undefined };
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      toast.error('Sức chứa phải là số nguyên dương.');
      return { ok: false };
    }
    return { ok: true, value };
  };

  const handleSubmitSingle = () => {
    if (!form.date) {
      toast.error('Vui lòng chọn ngày làm việc.');
      return;
    }
    const capacity = parseCapacity();
    if (!capacity.ok) return;

    // Chặn tạo ca cho block đã kết thúc (BE cũng chặn từng block, all-or-nothing).
    const blocksToCheck: Array<'morning' | 'afternoon'> =
      form.block === 'fullday' ? ['morning', 'afternoon'] : [form.block];
    const ended = blocksToCheck.filter((b) => isBlockEnded(form.date, b));
    if (ended.length > 0) {
      toast.error(
        form.block === 'fullday' && ended.length === 1
          ? 'Ca sáng hôm nay đã kết thúc — hãy chọn riêng ca chiều thay vì cả ngày.'
          : 'Khung giờ này đã kết thúc. Vui lòng chọn ca còn hiệu lực.',
      );
      return;
    }

    onSave({
      date: form.date,
      block: form.block,
      ...(capacity.value !== undefined ? { capacity: capacity.value } : {}),
      note: form.note,
    });
  };

  const handleSubmitRange = () => {
    if (!form.fromDate || !form.toDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (form.fromDate > form.toDate) {
      toast.error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    if (rangeDayCount(form.fromDate, form.toDate) > MAX_RANGE_DAYS) {
      toast.error(`Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày. Vui lòng chia nhỏ.`);
      return;
    }
    if (form.weekdays.length === 0) {
      toast.error('Chọn ít nhất một thứ trong tuần.');
      return;
    }
    const capacity = parseCapacity();
    if (!capacity.ok) return;

    // Ngày trùng ca cũ hoặc đã qua giờ sẽ được BE bỏ qua và báo lại — không chặn ở client.
    onSave({
      fromDate: form.fromDate,
      toDate: form.toDate,
      block: form.block,
      weekdays: form.weekdays,
      ...(capacity.value !== undefined ? { capacity: capacity.value } : {}),
      note: form.note,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && mode === 'range') handleSubmitRange();
    else handleSubmitSingle();
  };

  const selectedDays = countSelectedDays(form.fromDate, form.toDate, form.weekdays);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className='flex max-h-[90vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl duration-150 animate-in fade-in zoom-in-95'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between border-b border-border pb-3'>
          <h3 className='font-heading text-lg font-bold text-foreground'>
            {item ? 'Sửa ca làm việc' : 'Thêm ca làm việc mới'}
          </h3>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          >
            <X className='size-5' />
          </button>
        </div>

        {/* Chọn chế độ tạo (chỉ khi tạo mới) */}
        {!isEditing && (
          <div className='grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1'>
            {(
              [
                { key: 'single', label: 'Một ngày' },
                { key: 'range', label: 'Nhiều ngày' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type='button'
                onClick={() => setMode(opt.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  mode === opt.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className='flex flex-col gap-4'>
          {/* Ngày làm việc — một ngày */}
          {(isEditing || mode === 'single') && (
            <div>
              <label className={fieldLabelCls}>Ngày làm việc</label>
              <input
                type='date'
                min={minDate}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={fieldCls}
              />
            </div>
          )}

          {/* Khoảng ngày — nhiều ngày */}
          {!isEditing && mode === 'range' && (
            <>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className={fieldLabelCls}>Từ ngày</label>
                  <input
                    type='date'
                    min={today}
                    value={form.fromDate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fromDate: e.target.value,
                        // Kéo toDate theo nếu đang nhỏ hơn fromDate.
                        toDate:
                          f.toDate && f.toDate < e.target.value
                            ? e.target.value
                            : f.toDate,
                      }))
                    }
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className={fieldLabelCls}>Đến ngày</label>
                  <input
                    type='date'
                    min={form.fromDate || today}
                    value={form.toDate}
                    onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                    className={fieldCls}
                  />
                </div>
              </div>

              <div>
                <label className={fieldLabelCls}>Áp dụng cho các thứ</label>
                <div className='flex flex-wrap gap-1.5'>
                  {WEEKDAYS.map((w) => {
                    const active = form.weekdays.includes(w.iso);
                    return (
                      <button
                        key={w.iso}
                        type='button'
                        onClick={() => toggleWeekday(w.iso)}
                        aria-pressed={active}
                        className={`min-w-10 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  {selectedDays > 0
                    ? `Sẽ tạo ca cho ${selectedDays} ngày. Ngày đã có ca hoặc đã qua giờ sẽ được bỏ qua.`
                    : 'Chọn khoảng ngày và ít nhất một thứ trong tuần.'}
                </p>
              </div>
            </>
          )}

          {/* Ca làm (block) */}
          <div>
            <label className={fieldLabelCls}>Ca làm việc</label>
            <select
              value={form.block}
              onChange={(e) =>
                setForm({
                  ...form,
                  block: e.target.value as 'morning' | 'afternoon' | 'fullday',
                })
              }
              className={selectCls}
            >
              {/* Ở chế độ nhiều ngày, không disable theo "đã qua" của hôm nay — BE bỏ qua từng ngày. */}
              <option
                value='morning'
                disabled={mode === 'single' && isBlockEnded(form.date, 'morning')}
              >
                Sáng (08:00 – 12:00)
                {mode === 'single' && isBlockEnded(form.date, 'morning') ? ' — đã qua' : ''}
              </option>
              <option
                value='afternoon'
                disabled={mode === 'single' && isBlockEnded(form.date, 'afternoon')}
              >
                Chiều (14:00 – 17:00)
                {mode === 'single' && isBlockEnded(form.date, 'afternoon') ? ' — đã qua' : ''}
              </option>
              <option
                value='fullday'
                disabled={mode === 'single' && isBlockEnded(form.date, 'morning')}
              >
                Cả ngày (08:00 – 12:00 & 14:00 – 17:00)
                {mode === 'single' && isBlockEnded(form.date, 'morning') ? ' — sáng đã qua' : ''}
              </option>
            </select>
            <p className='mt-1 text-[11px] text-muted-foreground'>
              Cả ngày tạo 2 ca riêng: sáng và chiều (nghỉ trưa 12:00 – 14:00).
            </p>
          </div>

          {/* Sức chứa */}
          <div>
            <label className={fieldLabelCls}>Sức chứa (số xe tối đa)</label>
            <input
              type='number'
              min={1}
              step={1}
              inputMode='numeric'
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder='Bỏ trống để dùng mặc định của hệ thống'
              className={fieldCls}
            />
            <p className='mt-1 text-[11px] text-muted-foreground'>
              Số xe tối đa ca này có thể nhận. Bỏ trống nếu không giới hạn riêng.
            </p>
          </div>

          {/* Ghi chú */}
          <div>
            <label className={fieldLabelCls}>Ghi chú / Mô tả</label>
            <input
              type='text'
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder='Ghi chú ca trực...'
              className={fieldCls}
            />
          </div>
        </div>

        <div className='mt-2 flex gap-3 border-t border-border pt-4'>
          <Button type='button' variant='outline' className='flex-1' onClick={onClose}>
            Huỷ
          </Button>
          <Button type='submit' className='flex-1' disabled={isPending}>
            {isPending && <Spinner />}
            {!isEditing && mode === 'range' ? 'Tạo ca hàng loạt' : 'Lưu ca làm việc'}
          </Button>
        </div>
      </form>
    </div>
  );
}
