/** Hàm format dùng chung toàn app - locale Việt Nam. */

/**
 * Định dạng tiền tệ VND, ví dụ 150000 -> "150.000đ".
 * Dùng chữ "đ" thường thay cho ký hiệu ₫ (glyph gạch chân khó đọc,
 * người dùng phản ánh nhìn rối) — đổi ở đây là đổi toàn app.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)}đ`;
}

/** Định dạng số có dấu phân cách hàng nghìn, ví dụ 15000 -> "15.000". */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('vi-VN').format(value);
}

/** Định dạng phần trăm, ví dụ 85.2 -> "85,2%". Nhận giá trị đã nhân 100. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}%`;
}

/** Định dạng ngày dd/MM/yyyy. Nhận Date hoặc chuỗi ISO từ API. */
export function formatDate(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(
    'vi-VN',
    options ?? { day: '2-digit', month: '2-digit', year: 'numeric' },
  ).format(date);
}

/** Định dạng ngày kèm giờ, ví dụ "20/05/2026 14:30". */
export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Lấy khoá ngày "YYYY-MM-DD" theo GIỜ ĐỊA PHƯƠNG.
 * Không dùng `toISOString().split('T')[0]`: hàm đó trả về ngày theo UTC nên ở
 * VN (UTC+7) sẽ ra ngày hôm trước trong khoảng 00:00–06:59.
 */
export function toLocalDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** True nếu ngày (theo lịch) nằm sau hôm nay. Bỏ qua phần giờ. */
export function isFutureDay(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
}

/**
 * Lấy chữ viết tắt từ tên (tối đa 2 chữ cái cuối).
 * Gom logic đang lặp ở `Navbar.tsx`, `ProfileSidebar.tsx`, `app/profile/page.tsx`.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(-2)
    .join('')
    .toUpperCase();
  return initials || '?';
}

/**
 * Chuẩn hóa hiển thị biển số VN về một format duy nhất, ví dụ
 * "51A-12312" / "59A99999" / "51a 123.12" -> "51A-123.12" / "59A-999.99".
 * Dữ liệu nhập tự do nên chỉ chuẩn hóa lúc hiển thị, không đổi giá trị gốc.
 */
export function formatLicensePlate(plate?: string | null): string {
  if (!plate) return '';
  const raw = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Biển phổ thông: 2 số vùng + serie chữ (kèm số phụ nếu có) + 4-5 số cuối.
  // `\d??` lazy để ưu tiên phần đuôi đủ 5 số (51A77312 -> 51A-773.12).
  const match = raw.match(/^(\d{2}[A-Z]{1,2}\d??)(\d{4,5})$/);
  if (!match) return plate.toUpperCase();
  const [, prefix, digits] = match;
  const tail =
    digits.length === 5
      ? `${digits.slice(0, 3)}.${digits.slice(3)}`
      : digits;
  return `${prefix}-${tail}`;
}

/** Viết hoa chữ cái đầu mỗi từ - dùng cho tên người/hãng xe nhập tự do. */
export function capitalizeWords(value?: string | null): string {
  if (!value) return '';
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
