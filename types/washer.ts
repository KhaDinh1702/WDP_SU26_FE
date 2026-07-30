/** Kiểu dữ liệu cho màn giám sát thợ + đánh giá của thợ. */

import type { Feedback } from './feedback';

export type WasherWorkStatus = 'free' | 'assigned' | 'in_progress';

/** Phiếu rửa xe thợ đang phụ trách (BE WasherCurrentWorkOrder). */
export interface WasherCurrentWorkOrder {
  id: string;
  code: string;
  plate: string;
  vehicleTypeName?: string;
  serviceName: string;
  status: 'assigned' | 'in_progress';
  /** null khi thợ đã nhận nhưng chưa bấm bắt đầu. */
  startedAt: string | null;
  estimatedMinutes: number;
  stationName?: string;
}

/** Một dòng trên bảng giám sát thợ (BE WasherLiveStatusRow). */
export interface WasherLiveStatus {
  washerId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  onShift: boolean;
  status: WasherWorkStatus;
  currentWorkOrder: WasherCurrentWorkOrder | null;
}

/** Một đánh giá của khách (BE FeedbackResponseDto) - dùng chung với màn khách. */
export type WasherFeedbackItem = Feedback;

export interface WasherFeedbackList {
  data: WasherFeedbackItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Tổng hợp điểm của một thợ (BE WasherFeedbackSummaryDto). */
export interface WasherFeedbackSummary {
  washerId: string;
  averageRating: number;
  count: number;
  /** Số lượt theo từng mức sao '1'..'5'. */
  distribution: Record<string, number>;
}
