import { axiosInstance } from '@/lib/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { DashboardQuery, DashboardReport } from '@/types/dashboard';
import type {
  BulkCreateVoucherPayload,
  BulkVoucherResult,
  CampaignStats,
  CreateVoucherCampaignDto,
  GrantVoucherPayload,
  UpdateVoucherCampaignDto,
  Voucher,
  VoucherBatch,
  VoucherCampaign,
  VoucherCampaignListResponse,
  VoucherCampaignStatus,
  VoucherListResponse,
  VoucherStats,
  VoucherStatus,
} from '@/types/voucher';
import type {
  WasherFeedbackList,
  WasherFeedbackSummary,
  WasherLiveStatus,
} from '@/types/washer';

// ─── Auth ──────────────────────────────────────────────
export const adminGetMe = () => axiosInstance.get('/auth/me');

// ─── Management Reporting Dashboard ─────────────────────
export const adminGetDashboard = (params?: DashboardQuery) =>
  axiosInstance.get<DashboardReport>(ENDPOINTS.adminDashboard.report, {
    params,
  });

// ─── Users ─────────────────────────────────────────────
export const adminGetUsers = (params?: Record<string, unknown>) =>
  axiosInstance.get('/admin/users', { params });

export const adminGetUser = (id: string) =>
  axiosInstance.get(`/admin/users/${id}`);

export const adminCreateUser = (data: Record<string, unknown>) =>
  axiosInstance.post('/admin/users', data);

export const adminUpdateUser = (id: string, data: Record<string, unknown>) =>
  axiosInstance.patch(`/admin/users/${id}`, data);

export const adminDeleteUser = (id: string) =>
  axiosInstance.delete(`/admin/users/${id}`);

export const adminUpdateUserRole = (id: string, role: string) =>
  axiosInstance.patch(`/admin/users/${id}/role`, { role });

/** PATCH /admin/users/:id/status — BE nhận `{ isActive: boolean }` (`SetUserStatus`). */
export const adminUpdateUserStatus = (id: string, isActive: boolean) =>
  axiosInstance.patch(`/admin/users/${id}/status`, { isActive });

export const adminResetUserPassword = (id: string, newPassword: string) =>
  axiosInstance.post(`/admin/users/${id}/reset-password`, { newPassword });

// ─── Giám sát thợ (Manager/Admin) ───────────────────────
export const adminGetWasherStatus = () =>
  axiosInstance.get<WasherLiveStatus[]>(ENDPOINTS.adminShifts.washerStatus);

// ─── Đánh giá của khách (Manager/Admin) ─────────────────
/**
 * GET /admin/feedback - danh sách đánh giá, lọc theo thợ hoặc theo đơn.
 * Không truyền filter = mọi đánh giá của toàn hệ thống.
 */
export const adminGetFeedback = (params?: {
  washerId?: string;
  orderId?: string;
  page?: number;
  limit?: number;
}) =>
  axiosInstance.get<WasherFeedbackList>(ENDPOINTS.adminFeedback.list, {
    params,
  });

/**
 * GET /admin/feedback/washers/:washerId/summary - điểm trung bình, số lượt và
 * phân bố sao của MỘT thợ. BE không có endpoint tổng hợp cho toàn hệ thống.
 */
export const adminGetWasherFeedbackSummary = (washerId: string) =>
  axiosInstance.get<WasherFeedbackSummary>(
    ENDPOINTS.adminFeedback.washerSummary(washerId),
  );

// ─── Orders/Bookings (Manager) ──────────────────────────
export const adminGetOrders = (params?: Record<string, unknown>) =>
  axiosInstance.get('/admin/orders', { params });

export const adminGetOrder = (id: string) =>
  axiosInstance.get(`/admin/orders/${id}`);

export const adminUpdateOrderStatus = (id: string, status: string, reason?: string) =>
  axiosInstance.patch(`/admin/orders/${id}/status`, { status, reason });

export const adminMarkOrderPaid = (id: string) =>
  axiosInstance.post(`/admin/orders/${id}/mark-paid`);

// Tương thích ngược với UI cũ dùng tên bookings
export const adminGetBookings = adminGetOrders;
export const adminGetBooking = adminGetOrder;
export const adminUpdateBookingStatus = (id: string, status: string) =>
  adminUpdateOrderStatus(id, status);

// ─── Service Types ─────────────────────────────────────
export const adminGetServiceTypes = () =>
  axiosInstance.get('/admin/service-types');

export const adminCreateServiceType = (data: Record<string, unknown>) =>
  axiosInstance.post('/admin/service-types', data);

export const adminUpdateServiceType = (id: string, data: Record<string, unknown>) =>
  axiosInstance.patch(`/admin/service-types/${id}`, data);

export const adminToggleServiceType = (id: string, isActive: boolean) =>
  axiosInstance.patch(`/admin/service-types/${id}/status`, { isActive });

// ─── Vehicle Types ─────────────────────────────────────
export const adminGetVehicleTypes = () =>
  axiosInstance.get('/admin/vehicle-types');

export const adminCreateVehicleType = (data: Record<string, unknown>) =>
  axiosInstance.post('/admin/vehicle-types', data);

export const adminUpdateVehicleType = (id: string, data: Record<string, unknown>) =>
  axiosInstance.patch(`/admin/vehicle-types/${id}`, data);

export const adminToggleVehicleType = (id: string, isActive: boolean) =>
  axiosInstance.patch(`/admin/vehicle-types/${id}/status`, { isActive });

// ─── Tier Configs ──────────────────────────────────────
export const adminGetTierConfigs = () =>
  axiosInstance.get('/admin/tier-configs');

export const adminUpdateTierConfig = (id: string, data: Record<string, unknown>) =>
  axiosInstance.patch(`/admin/tier-configs/${id}`, data);

export const adminToggleTierConfig = (id: string, isActive: boolean) =>
  axiosInstance.patch(`/admin/tier-configs/${id}/status`, { isActive });

// ─── Shifts ────────────────────────────────────────────
export const adminGetShifts = (params?: Record<string, unknown>) =>
  axiosInstance.get('/admin/shifts', { params });

// GET /admin/shifts/staff đã bị BE xoá khi chuyển sang ca ẩn danh —
// danh sách thợ lấy qua adminGetWasherStatus.

export const adminCreateShift = (data: Record<string, unknown>) =>
  axiosInstance.post('/admin/shifts', data);

/** Tạo ca cho một khoảng ngày trong 1 lần — POST /admin/shifts/bulk. */
export interface BulkCreateShiftPayload {
  /** YYYY-MM-DD (giờ VN, inclusive). */
  fromDate: string;
  /** YYYY-MM-DD (giờ VN, inclusive). Khoảng tối đa 92 ngày. */
  toDate: string;
  block: 'morning' | 'afternoon' | 'fullday';
  /** Thứ theo ISO: T2=1 … CN=7. Bỏ trống = mọi thứ. */
  weekdays?: number[];
  capacity?: number;
  note?: string;
}

export interface BulkCreateShiftResult {
  created: unknown[];
  skipped: Array<{
    date: string;
    block: 'morning' | 'afternoon';
    reason: 'overlap' | 'past';
  }>;
  meta: { requestedDays: number; createdCount: number; skippedCount: number };
}

export const adminBulkCreateShifts = (data: BulkCreateShiftPayload) =>
  axiosInstance.post<BulkCreateShiftResult>(ENDPOINTS.adminShifts.bulk, data);

export const adminUpdateShift = (id: string, data: Record<string, unknown>) =>
  axiosInstance.patch(`/admin/shifts/${id}`, data);

// Cập nhật trạng thái ca trực. status ∈ scheduled | active | completed | cancelled
export const adminToggleShift = (id: string, status: string) =>
  axiosInstance.patch(`/admin/shifts/${id}/status`, { status });

// ─── Vehicles ──────────────────────────────────────────
export const adminGetVehicles = (params?: Record<string, unknown>) =>
  axiosInstance.get('/admin/vehicles', { params });

export const adminGetVehicle = (id: string) =>
  axiosInstance.get(`/admin/vehicles/${id}`);

// ─── Work Orders (Manager) ──────────────────────────────
// Check-in: tạo phiếu rửa từ đơn đã xác nhận. BE tự chuyển đơn
// CONFIRMED → CHECKED_IN (và mark PAID nếu đơn tiền mặt), nên KHÔNG
// cần gọi thêm updateOrderStatus. checkinPhotos là ảnh hiện trạng xe (tuỳ chọn).
export const adminCreateWorkOrder = (orderId: string, checkinPhotos?: string[]) =>
  axiosInstance.post('/admin/work-orders', {
    orderId,
    ...(checkinPhotos?.length ? { checkinPhotos } : {}),
  });

export const adminGetWorkOrders = (params?: Record<string, unknown>) =>
  axiosInstance.get('/admin/work-orders', { params });

export const adminGetWorkOrder = (id: string) =>
  axiosInstance.get(`/admin/work-orders/${id}`);

export const adminAssignWasher = (id: string, washerId: string) =>
  axiosInstance.patch(`/admin/work-orders/${id}/assign`, { washerId });

// ─── Vouchers (Admin / Manager) ────────────────────────
// Kiểu dữ liệu voucher đã chuyển sang `@/types/voucher` (mirror Swagger).
// Re-export để các import cũ từ '@/lib/admin-api' không gãy.
export type {
  BulkCreateVoucherPayload,
  BulkVoucherResult,
  GrantVoucherPayload,
  VoucherBatch,
  VoucherStats,
} from '@/types/voucher';

export const adminGetVouchers = (params?: {
  page?: number;
  limit?: number;
  status?: VoucherStatus;
  customerId?: string;
}) => axiosInstance.get<VoucherListResponse>(ENDPOINTS.adminVouchers.list, { params });

export const adminGetVoucherStats = () =>
  axiosInstance.get<VoucherStats>(ENDPOINTS.adminVouchers.stats);

export const adminGetVoucherBatches = () =>
  axiosInstance.get<{ batches: VoucherBatch[] }>(
    ENDPOINTS.adminVouchers.batches,
  );

export const adminGetVoucher = (id: string) =>
  axiosInstance.get<Voucher>(ENDPOINTS.adminVouchers.byId(id));

export const adminGrantVoucher = (data: GrantVoucherPayload) =>
  axiosInstance.post<Voucher>(ENDPOINTS.adminVouchers.create, data);

export const adminBulkCreateVouchers = (data: BulkCreateVoucherPayload) =>
  axiosInstance.post<BulkVoucherResult>(ENDPOINTS.adminVouchers.bulk, data);

/**
 * PATCH /admin/vouchers/:id/revoke — voucher chuyển sang `revoked`.
 * `revoked` là trạng thái RIÊNG, BE không gộp vào `expired`.
 */
export const adminRevokeVoucher = (id: string, reason: string) =>
  axiosInstance.patch<Voucher>(ENDPOINTS.adminVouchers.revoke(id), { reason });

// ─── Voucher Campaigns (Admin / Manager) ───────────────
// Chiến dịch định nghĩa luật cho voucher: loại ưu đãi, mức giảm, đơn tối thiểu,
// phạm vi áp dụng, chính sách cộng dồn, ngân sách và giới hạn lượt dùng.
export const adminGetVoucherCampaigns = (params?: {
  status?: VoucherCampaignStatus;
  source?: string;
  page?: number;
  limit?: number;
}) =>
  axiosInstance.get<VoucherCampaignListResponse>(
    ENDPOINTS.adminVoucherCampaigns.list,
    { params },
  );

export const adminGetVoucherCampaign = (id: string) =>
  axiosInstance.get<VoucherCampaign>(
    ENDPOINTS.adminVoucherCampaigns.byId(id),
  );

/** Tạo chiến dịch — luôn ở trạng thái DRAFT, chưa phát hành voucher nào. */
export const adminCreateVoucherCampaign = (data: CreateVoucherCampaignDto) =>
  axiosInstance.post<VoucherCampaign>(
    ENDPOINTS.adminVoucherCampaigns.create,
    data,
  );

/** Sửa từng phần. Chiến dịch ENDED là bất biến. `status` không sửa ở đây. */
export const adminUpdateVoucherCampaign = (
  id: string,
  data: UpdateVoucherCampaignDto,
) =>
  axiosInstance.patch<VoucherCampaign>(
    ENDPOINTS.adminVoucherCampaigns.byId(id),
    data,
  );

/** DRAFT/SCHEDULED/PAUSED → ACTIVE (hoặc SCHEDULED nếu validFrom còn ở tương lai). */
export const adminActivateVoucherCampaign = (id: string) =>
  axiosInstance.post<VoucherCampaign>(
    ENDPOINTS.adminVoucherCampaigns.activate(id),
  );

/** ACTIVE/SCHEDULED → PAUSED. Voucher đã phát tạm ngừng dùng được, không bị thu hồi. */
export const adminPauseVoucherCampaign = (id: string) =>
  axiosInstance.post<VoucherCampaign>(
    ENDPOINTS.adminVoucherCampaigns.pause(id),
  );

/** Trạng thái cuối. Chiến dịch và voucher của nó được giữ lại làm lịch sử. */
export const adminEndVoucherCampaign = (id: string) =>
  axiosInstance.post<VoucherCampaign>(ENDPOINTS.adminVoucherCampaigns.end(id));

export const adminGetVoucherCampaignStats = (id: string) =>
  axiosInstance.get<CampaignStats>(ENDPOINTS.adminVoucherCampaigns.stats(id));

// ─── Golden Hours ──────────────────────────────────────
export const adminGetGoldenHours = () =>
  axiosInstance.get(ENDPOINTS.adminGoldenHours.list);

export const adminCreateGoldenHour = (data: Record<string, unknown>) =>
  axiosInstance.post(ENDPOINTS.adminGoldenHours.create, data);

export const adminUpdateGoldenHour = (id: string, data: Record<string, unknown>) =>
  axiosInstance.patch(ENDPOINTS.adminGoldenHours.byId(id), data);

export const adminDeleteGoldenHour = (id: string) =>
  axiosInstance.delete(ENDPOINTS.adminGoldenHours.byId(id));

// ─── Pricing Policy ────────────────────────────────────
export const adminGetPricingPolicy = () =>
  axiosInstance.get(ENDPOINTS.adminPricingPolicy.get);

export const adminUpdatePricingPolicy = (data: Record<string, unknown>) =>
  axiosInstance.patch(ENDPOINTS.adminPricingPolicy.update, data);

// ─── Work Orders Queue ──────────────────────────────────
export const adminGetWorkOrdersQueue = () =>
  axiosInstance.get(ENDPOINTS.adminWorkOrders.queue);

// ─── Chat Knowledge (huấn luyện trợ lý AI - admin/manager) ──────────
export interface ChatKnowledgePayload {
  question: string;
  answer: string;
  keywords?: string[];
  category?: string;
  isActive?: boolean;
}

export const adminGetChatKnowledge = () =>
  axiosInstance.get(ENDPOINTS.adminChatKnowledge.list);

export const adminGetChatKnowledgeEntry = (id: string) =>
  axiosInstance.get(ENDPOINTS.adminChatKnowledge.byId(id));

export const adminCreateChatKnowledge = (data: ChatKnowledgePayload) =>
  axiosInstance.post(ENDPOINTS.adminChatKnowledge.create, data);

export const adminUpdateChatKnowledge = (
  id: string,
  data: Partial<ChatKnowledgePayload>,
) => axiosInstance.patch(ENDPOINTS.adminChatKnowledge.byId(id), data);

export const adminDeleteChatKnowledge = (id: string) =>
  axiosInstance.delete(ENDPOINTS.adminChatKnowledge.byId(id));
