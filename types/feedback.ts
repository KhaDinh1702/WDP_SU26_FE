/** Kiểu dữ liệu đánh giá dịch vụ - mirror BE `feedback` module. */

/** Một đánh giá của khách cho một đơn (BE `FeedbackResponse`). */
export interface Feedback {
  id: string;
  orderId: string;
  workOrderId: string;
  workOrderCode?: string;
  vehiclePlate?: string;
  customerId: string;
  customerName?: string;
  washerId: string;
  washerName?: string;
  /** 1-5 sao. */
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * `GET /me/feedback/:orderId` - BE `FeedbackEligibility`.
 * `feedback` là null khi khách chưa chấm điểm đơn này.
 */
export interface FeedbackEligibility {
  /** Đơn có được chấm điểm hay không, do BE quyết định. */
  eligible: boolean;
  alreadyRated: boolean;
  feedback: Feedback | null;
}
