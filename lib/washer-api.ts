import { axiosInstance } from '@/lib/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { WasherFeedbackList, WasherFeedbackSummary } from '@/types/washer';

/**
 * Lấy danh sách Work Orders được phân công cho thợ rửa xe hiện tại
 */
export const washerGetWorkOrders = (params?: Record<string, unknown>) =>
  axiosInstance.get('/me/work-orders', { params });

/**
 * Lấy chi tiết Work Order
 */
export const washerGetWorkOrder = (id: string) =>
  axiosInstance.get(`/me/work-orders/${id}`);

/**
 * Bắt đầu làm việc (Rửa xe)
 */
export const washerStartWorkOrder = (id: string) =>
  axiosInstance.patch(`/me/work-orders/${id}/start`);

/**
 * Hoàn thành rửa xe — bước cuối của phiếu (BE tự complete đơn, QC đã bỏ)
 */
export const washerFinishWorkOrder = (id: string, checkoutPhotos: string[]) =>
  axiosInstance.patch(`/me/work-orders/${id}/finish`, { checkoutPhotos });

/**
 * Lấy lịch trình rửa xe cá nhân của thợ
 */
export const washerGetSchedule = (params?: { date?: string; from?: string; to?: string; status?: string }) =>
  axiosInstance.get(ENDPOINTS.washerSchedule.me, { params });

/**
 * Danh sách đánh giá của khách về chính thợ đang đăng nhập
 */
export const washerGetFeedback = (params?: { page?: number; limit?: number }) =>
  axiosInstance.get<WasherFeedbackList>(ENDPOINTS.washerFeedback.list, { params });

/**
 * Điểm trung bình + phân bố sao của chính thợ đang đăng nhập
 */
export const washerGetFeedbackSummary = () =>
  axiosInstance.get<WasherFeedbackSummary>(ENDPOINTS.washerFeedback.summary);
