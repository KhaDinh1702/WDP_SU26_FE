import { axiosInstance } from '@/lib/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AuthResponse,
  ForgotPasswordDto,
  GoogleLoginDto,
  MessageResponse,
  ResetPasswordDto,
} from '@/types/auth';
import type {
  Voucher,
  VoucherCampaignPublic,
  VoucherStatus,
} from '@/types/voucher';

// ─── Vehicle Types (Public) ────────────────────────────
export const getActiveVehicleTypes = () => axiosInstance.get('/vehicle-types');

// ─── Vehicles (Customer) ──────────────────────────────
export const getMyVehicles = () => axiosInstance.get('/me/vehicles');

export const getMyVehicle = (id: string) =>
  axiosInstance.get(`/me/vehicles/${id}`);

export const createVehicle = (data: {
  vehicleTypeId: string;
  licensePlate: string;
  nickname?: string;
  brand?: string;
  model?: string;
  color?: string;
  isDefault?: boolean;
}) => axiosInstance.post('/me/vehicles', data);

export const updateVehicle = (
  id: string,
  data: {
    vehicleTypeId?: string;
    licensePlate?: string;
    nickname?: string;
    brand?: string;
    model?: string;
    color?: string;
  },
) => axiosInstance.patch(`/me/vehicles/${id}`, data);

export const deleteVehicle = (id: string) =>
  axiosInstance.delete(`/me/vehicles/${id}`);

export const setDefaultVehicle = (id: string) =>
  axiosInstance.patch(`/me/vehicles/${id}/set-default`);

// ─── Loyalty & Tiers (Customer) ─────────────────────────
export const getMyLoyalty = () => axiosInstance.get(ENDPOINTS.loyalty.mine);

export const getMyLoyaltyTransactions = (page = 1, limit = 100) =>
  axiosInstance.get(ENDPOINTS.loyalty.transactions, {
    params: { page, limit },
  });

// ─── Vouchers (Customer) ───────────────────────────────
/** GET /me/vouchers — trả MẢNG voucher (không phân trang), campaign nhúng sẵn. */
export const getMyVouchers = (status?: VoucherStatus) =>
  axiosInstance.get<Voucher[]>(ENDPOINTS.vouchers.mine, {
    params: status ? { status } : {},
  });

export const getMyVoucher = (id: string) =>
  axiosInstance.get<Voucher>(ENDPOINTS.vouchers.byId(id));

/**
 * Khách nhận 1 voucher pool bằng mã — POST /me/vouchers/claim.
 * BE bỏ khoảng trắng và không phân biệt hoa thường. 404 = mã sai, đã có người
 * nhận, hoặc đã hết hạn.
 */
export const claimVoucher = (code: string) =>
  axiosInstance.post<Voucher>(ENDPOINTS.vouchers.claim, { code });

/**
 * GET /voucher-campaigns/:id — bản chiếu công khai của chiến dịch.
 * Chỉ cần khi voucher thiếu `campaign` nhúng sẵn: ví voucher nên đọc thẳng
 * `voucher.campaign` để khỏi gọi thêm mỗi thẻ. Chiến dịch DRAFT trả 404.
 */
export const getVoucherCampaign = (id: string) =>
  axiosInstance.get<VoucherCampaignPublic>(
    ENDPOINTS.voucherCampaigns.byId(id),
  );

// ─── Notifications ─────────────────────────────────────
export const getNotifications = (page = 1, limit = 20) =>
  axiosInstance.get(ENDPOINTS.notifications.list, { params: { page, limit } });

export const getUnreadCount = () =>
  axiosInstance.get(ENDPOINTS.notifications.unreadCount);

export const markNotificationRead = (id: string) =>
  axiosInstance.patch(ENDPOINTS.notifications.read(id));

export const markAllNotificationsRead = () =>
  axiosInstance.patch(ENDPOINTS.notifications.readAll);

export const getTierConfigs = () => axiosInstance.get('/tier-configs');

export const getTierConfig = (id: string) =>
  axiosInstance.get(`/tier-configs/${id}`);

// ─── Auth OTP (Customer) ────────────────────────────────
export const sendOtp = (data: { email: string }) =>
  axiosInstance.post(ENDPOINTS.auth.otpSend, data);

export const verifyOtp = (data: { email: string; code: string }) =>
  axiosInstance.post(ENDPOINTS.auth.otpVerify, data);

// ─── Google Auth ────────────────────────────────────────
/**
 * POST /auth/google — luồng SPA: gửi Google **id_token** đã có sẵn ở client.
 * Lần gọi đầu BE tự tạo tài khoản, các lần sau là đăng nhập; không có endpoint
 * "đăng ký Google" riêng. Tài khoản mới đã xác thực email nhưng CHƯA có số điện
 * thoại và mật khẩu, nên trước lần đặt lịch đầu tiên cần PATCH /me/profile để
 * bổ sung phone; muốn có mật khẩu thì đi qua POST /auth/forgot-password.
 *
 * Lỗi: 401 token/email chưa xác thực/tài khoản bị khoá, 409 email đã gắn tài
 * khoản Google khác, 503 BE chưa cấu hình biến môi trường GOOGLE_*.
 */
export const googleLogin = (data: GoogleLoginDto) =>
  axiosInstance.post<AuthResponse>(ENDPOINTS.auth.google, data);

/**
 * URL bắt đầu luồng redirect Google. Phải điều hướng cả TRÌNH DUYỆT tới đây
 * (`window.location.href = ...`), không dùng fetch/axios: BE trả 302 sang màn
 * hình đồng ý của Google và CORS không áp dụng.
 *
 * `redirect` phải cùng origin với FRONTEND_URL của BE, nếu không BE lặng lẽ thay
 * bằng mặc định `{FRONTEND_URL}/auth/google/callback` — vì URL này mang token
 * phiên. Token về ở FRAGMENT của URL (`#accessToken=...&refreshToken=...`) nên
 * không lọt vào log server hay header Referer; lỗi về ở `#error=...`.
 */
export const buildGoogleRedirectUrl = (redirect?: string) => {
  const base = `${process.env.NEXT_PUBLIC_API_URL ?? ''}${ENDPOINTS.auth.googleRedirect}`;
  return redirect ? `${base}?redirect=${encodeURIComponent(redirect)}` : base;
};

// ─── Password recovery ──────────────────────────────────
/**
 * POST /auth/forgot-password — luôn trả 200 với cùng một thông điệp dù email có
 * tồn tại hay không (chống dò tài khoản). Giới hạn 5 lần/giờ cho mỗi email (429).
 */
export const forgotPassword = (data: ForgotPasswordDto) =>
  axiosInstance.post<MessageResponse>(ENDPOINTS.auth.forgotPassword, data);

/**
 * POST /auth/reset-password — tiêu thụ mã 6 số dùng một lần. Sai 5 lần là mã
 * cháy. Thành công thì mọi refresh token cấp trước đó bị thu hồi.
 */
export const resetPassword = (data: ResetPasswordDto) =>
  axiosInstance.post<MessageResponse>(ENDPOINTS.auth.resetPassword, data);

// ─── Profile ────────────────────────────────────────────
// GET/PATCH /me/profile và POST /me/profile/change-password nằm ở
// `@/lib/profile-api` để tránh hai nguồn sự thật.

// ─── Service Types (Public) ────────────────────────────
export const getActiveServiceTypes = () => axiosInstance.get('/service-types');

export const getServiceType = (id: string) =>
  axiosInstance.get(`/service-types/${id}`);

// ─── Orders (Customer) ─────────────────────────────────
export const getMyOrders = () => axiosInstance.get('/me/orders');

export const getMyOrder = (id: string) => axiosInstance.get(`/me/orders/${id}`);

export const createOrder = (data: {
  vehicleId?: string;
  vehicle?: {
    vehicleTypeId: string;
    licensePlate: string;
    nickname?: string;
    brand?: string;
    model?: string;
    color?: string;
    isDefault?: boolean;
  };
  serviceTypeId: string;
  scheduledAt: string;
  paymentMethod: 'online' | 'cash';
  note?: string;
  voucherId?: string;
}) => axiosInstance.post('/me/orders', data);

// ─── Order Price Preview (Customer) ────────────────────
export const previewOrder = (data: {
  serviceTypeId: string;
  vehicleTypeId: string;
  scheduledAt: string;
  voucherId?: string;
}) => axiosInstance.post('/me/orders/preview', data);

/**
 * Work order của một đơn — GET /me/orders/:id/work-order.
 * Chứa ảnh hiện trạng xe: `checkinPhotos` (trước khi rửa, quầy chụp lúc check-in)
 * và `checkoutPhotos` (sau khi rửa, thợ chụp lúc hoàn thành).
 */
export const getMyOrderWorkOrder = (orderId: string) =>
  axiosInstance.get(ENDPOINTS.orders.mineWorkOrder(orderId));

export const rescheduleOrder = (
  id: string,
  data: { staffShiftId?: string; scheduledAt: string },
) => axiosInstance.patch(`/me/orders/${id}/reschedule`, data);

export const cancelOrder = (id: string, data: { reason?: string }) =>
  axiosInstance.patch(`/me/orders/${id}/cancel`, data);

// ─── Available Slots & Shifts ──────────────────────────
export const getAvailableSlots = (params: {
  serviceTypeId: string;
  vehicleTypeId: string;
  from: string;
  to: string;
}) => axiosInstance.get('/me/orders/available-slots', { params });

export const getAvailableShifts = (params: {
  from: string;
  to: string;
  shiftType?: 'cashier' | 'washer';
}) => axiosInstance.get('/shifts/available', { params });

// ─── Feedback (Customer) ────────────────────────────────
export const submitFeedback = (data: { orderId: string; rating: number; comment?: string }) =>
  axiosInstance.post(ENDPOINTS.feedback.submit, data);

export const getFeedbackEligibility = (orderId: string) =>
  axiosInstance.get(ENDPOINTS.feedback.byOrderId(orderId));
