// Helpers thuần (không phụ thuộc React) cho trang Phân ca làm việc.
// Chuẩn hoá format ngày giờ tiếng Việt, suy ra trạng thái ca, tính sức chứa…
// KHÔNG đổi tên field API — chỉ đọc dữ liệu shift hiện có.

export type PopulatedStaff = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  role?: string;
};

export type Shift = {
  _id?: string;
  id?: string;
  // staffId / stationName có thể vắng mặt trong response (contract mới).
  staffId?: string | PopulatedStaff;
  shiftType?: 'cashier' | 'washer';
  stationName?: string;
  startAt?: string;
  endAt?: string;
  /** Sức chứa khai báo khi tạo ca (contract mới) — ưu tiên hơn maxBookings. */
  capacity?: number;
  maxBookings?: number;
  currentBookings?: number;
  status?: string;
  note?: string;
  createdAt?: string;
};

export type UserData = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

/** Trạng thái suy diễn (gộp `status` thật + mốc thời gian) để hiển thị & lọc. */
export type ShiftStatusKey =
  | 'active'
  | 'upcoming'
  | 'overdue'
  | 'completed'
  | 'cancelled'
  | 'unknown';

/** Khớp với variant của <Badge /> trong components/ui/badge.tsx */
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'
  | 'muted'
  | 'outline'
  | 'solid';

export type DateRangeKey = 'all' | 'today' | 'week' | 'month';
export type SortKey = 'latest' | 'soonest' | 'newest' | 'capacity';

const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (iso?: string): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ─── Format ngày giờ (tiếng Việt) ──────────────────────────────────
export function formatDateVN(iso?: string): string {
  const d = toDate(iso);
  if (!d) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTimeVN(iso?: string): string {
  const d = toDate(iso);
  if (!d) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTimeVN(iso?: string): string {
  const d = toDate(iso);
  if (!d) return '—';
  return `${formatDateVN(iso)} ${formatTimeVN(iso)}`;
}

/** Ví dụ: "08:00 - 12:00 · 25/06/2026" (cùng ngày) hoặc khoảng ngày đầy đủ. */
export function formatTimeRange(start?: string, end?: string): string {
  const s = toDate(start);
  if (!s) return '—';
  const e = toDate(end);
  if (!e) return `${formatTimeVN(start)} · ${formatDateVN(start)}`;
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${formatTimeVN(start)} - ${formatTimeVN(end)} · ${formatDateVN(start)}`;
  }
  return `${formatDateTimeVN(start)} → ${formatDateTimeVN(end)}`;
}

/** "4 giờ", "4 giờ 30 phút" hoặc null nếu không tính được. */
export function formatDuration(start?: string, end?: string): string | null {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  const mins = Math.round((e.getTime() - s.getTime()) / 60000);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return `${h} giờ`;
  return `${m} phút`;
}

// ─── Định danh & nhân sự ───────────────────────────────────────────
export function getShiftId(shift: Shift): string {
  return shift._id ?? shift.id ?? '';
}

export function getStaffId(shift: Shift): string {
  if (typeof shift.staffId === 'object' && shift.staffId) {
    return shift.staffId._id ?? shift.staffId.id ?? '';
  }
  return shift.staffId ?? '';
}

/** Tên nhân viên được phân, ưu tiên danh sách staff; null nếu chưa phân. */
export function getStaffName(shift: Shift, staffList: UserData[]): string | null {
  const sid = getStaffId(shift);
  const fromList = staffList.find((u) => (u._id ?? u.id) === sid);
  const name =
    fromList?.fullName ??
    fromList?.name ??
    (typeof shift.staffId === 'object'
      ? shift.staffId?.fullName ?? shift.staffId?.name
      : undefined);
  return name && name.trim() ? name : null;
}

/** Chữ cái đầu cho avatar fallback. */
export function getInitial(name?: string | null): string {
  return (name?.trim()?.[0] ?? '?').toUpperCase();
}

// ─── Vai trò ───────────────────────────────────────────────────────
export function getRoleLabel(shiftType?: string): string {
  switch (shiftType) {
    case 'washer':
      return 'Thợ rửa xe';
    case 'cashier':
      return 'Thu ngân';
    case 'manager':
      return 'Quản lý';
    default:
      return 'Khác';
  }
}

/** Class màu cho role badge — tách biệt với màu semantic của trạng thái. */
export function getRoleBadgeClass(shiftType?: string): string {
  switch (shiftType) {
    case 'washer':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
    case 'cashier':
      return 'bg-sky-50 text-sky-700 border border-sky-100';
    default:
      return 'bg-muted text-foreground/70 border border-border';
  }
}

// ─── Trạng thái suy diễn ───────────────────────────────────────────
export function getShiftStatus(shift: Shift, now: number = Date.now()): ShiftStatusKey {
  switch (shift.status) {
    case 'cancelled':
      return 'cancelled';
    case 'completed':
      return 'completed';
    case 'active':
      return 'active';
    case 'scheduled': {
      const end = toDate(shift.endAt);
      if (end && end.getTime() < now) return 'overdue';
      return 'upcoming';
    }
    default:
      return 'unknown';
  }
}

export const STATUS_META: Record<
  ShiftStatusKey,
  { label: string; badgeVariant: BadgeVariant; dotClass: string; accentBorder: string }
> = {
  active: {
    label: 'Đang diễn ra',
    badgeVariant: 'success',
    dotClass: 'bg-success',
    accentBorder: 'border-l-success',
  },
  upcoming: {
    label: 'Sắp tới',
    badgeVariant: 'info',
    dotClass: 'bg-info',
    accentBorder: 'border-l-info',
  },
  overdue: {
    label: 'Quá hạn',
    badgeVariant: 'warning',
    dotClass: 'bg-warning',
    accentBorder: 'border-l-warning',
  },
  completed: {
    label: 'Hoàn thành',
    badgeVariant: 'muted',
    dotClass: 'bg-muted-foreground',
    accentBorder: 'border-l-border',
  },
  cancelled: {
    label: 'Đã hủy',
    badgeVariant: 'destructive',
    dotClass: 'bg-destructive',
    accentBorder: 'border-l-destructive',
  },
  unknown: {
    label: 'Không xác định',
    badgeVariant: 'muted',
    dotClass: 'bg-muted-foreground',
    accentBorder: 'border-l-border',
  },
};

/** Ca cần xử lý (đánh dấu cảnh báo): scheduled nhưng đã quá giờ kết thúc. */
export function shiftNeedsAttention(shift: Shift, now?: number): boolean {
  return getShiftStatus(shift, now) === 'overdue';
}

// ─── Sức chứa (số xe nhận được trong ca) ───────────────────────────
export type Capacity = {
  current: number;
  max: number | null;
  free: number | null;
  ratio: number; // 0..1
  isFull: boolean;
  hasData: boolean;
};

export function getCapacity(shift: Shift): Capacity {
  const current = shift.currentBookings ?? 0;
  const max =
    typeof shift.capacity === 'number'
      ? shift.capacity
      : typeof shift.maxBookings === 'number'
        ? shift.maxBookings
        : null;
  const hasData = max !== null && max > 0;
  const free = hasData ? Math.max(0, (max as number) - current) : null;
  const ratio = hasData ? Math.min(1, current / (max as number)) : 0;
  const isFull = hasData ? current >= (max as number) : false;
  return { current, max, free, ratio, isFull, hasData };
}

// ─── Sắp xếp ───────────────────────────────────────────────────────
export function getStartMs(shift: Shift): number {
  const d = toDate(shift.startAt);
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

export function getCreatedMs(shift: Shift): number {
  const d = toDate(shift.createdAt);
  if (d) return d.getTime();
  const start = toDate(shift.startAt);
  return start ? start.getTime() : 0;
}

/**
 * Sắp xếp ca (trả về mảng mới) theo tiêu chí đã chọn. Giữ `Date.now()` trong
 * helper để component render vẫn "thuần" — với "soonest" ca sắp diễn ra lên
 * đầu, ca đã qua dồn xuống cuối (ca vừa qua gần nhất trước).
 */
export function sortShifts(list: Shift[], sort: SortKey): Shift[] {
  const now = Date.now();
  return [...list].sort((a, b) => {
    if (sort === 'latest') {
      // Ngày ca mới nhất lên đầu. Ca thiếu startAt quy về 0 để dồn xuống cuối
      // (getStartMs trả Infinity — nếu để nguyên sẽ nhảy lên đầu khi sort giảm dần).
      const ms = (s: Shift) => {
        const v = getStartMs(s);
        return Number.isFinite(v) ? v : 0;
      };
      return ms(b) - ms(a);
    }
    if (sort === 'soonest') {
      const aPast = getStartMs(a) < now;
      const bPast = getStartMs(b) < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return aPast
        ? getStartMs(b) - getStartMs(a)
        : getStartMs(a) - getStartMs(b);
    }
    if (sort === 'newest') return getCreatedMs(b) - getCreatedMs(a);
    return getCapacity(b).ratio - getCapacity(a).ratio;
  });
}

// ─── Lọc theo khoảng ngày (dựa trên startAt) ───────────────────────
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isWithinRange(
  shift: Shift,
  range: DateRangeKey,
  now: Date = new Date(),
): boolean {
  if (range === 'all') return true;
  const d = toDate(shift.startAt);
  if (!d) return false;

  if (range === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (range === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  // week: tuần hiện tại bắt đầu từ Thứ Hai
  const today = startOfDay(now);
  const dayIdx = (today.getDay() + 6) % 7; // 0 = Thứ Hai
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayIdx);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return d.getTime() >= monday.getTime() && d.getTime() < nextMonday.getTime();
}

// ─── Tổng hợp KPI ──────────────────────────────────────────────────
export type ShiftKpis = {
  total: number;
  active: number;
  upcoming: number;
  overdue: number;
  cancelled: number;
  completed: number;
};

export function computeKpis(shifts: Shift[], now: number = Date.now()): ShiftKpis {
  const kpis: ShiftKpis = {
    total: shifts.length,
    active: 0,
    upcoming: 0,
    overdue: 0,
    cancelled: 0,
    completed: 0,
  };
  for (const s of shifts) {
    const status = getShiftStatus(s, now);
    if (status === 'active') kpis.active += 1;
    else if (status === 'upcoming') kpis.upcoming += 1;
    else if (status === 'overdue') kpis.overdue += 1;
    else if (status === 'cancelled') kpis.cancelled += 1;
    else if (status === 'completed') kpis.completed += 1;
  }
  return kpis;
}
