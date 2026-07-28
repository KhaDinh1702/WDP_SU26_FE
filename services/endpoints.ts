/**
 * Bản đồ endpoint tập trung. Hook/service import từ đây thay vì viết
 * chuỗi path rải rác - đổi route chỉ sửa một nơi.
 * Path khớp với controller của BE (NestJS).
 */
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    /** POST - đăng nhập/đăng ký bằng Google id_token (luồng SPA). */
    google: '/auth/google',
    /** GET - điều hướng TRÌNH DUYỆT tới đây để bắt đầu luồng redirect Google. */
    googleRedirect: '/auth/google',
    /** GET - Google gọi về đây. Không bao giờ gọi từ code ứng dụng. */
    googleCallback: '/auth/google/callback',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    /** Trả về AuthPayload (sub/email/role), KHÔNG phải hồ sơ đầy đủ. */
    me: '/auth/me',
    otpSend: '/auth/otp/send',
    otpVerify: '/auth/otp/verify',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    adminOnly: '/auth/admin-only',
  },
  /** Hồ sơ của chính người đăng nhập - BE `MeProfileController` (@Controller('me/profile')). */
  profile: {
    me: '/me/profile',
    changePassword: '/me/profile/change-password',
  },
  /** Đơn của chính khách hàng - BE `OrderController` (@Controller('me/orders')). */
  orders: {
    mine: '/me/orders',
    mineById: (id: string) => `/me/orders/${id}`,
    reschedule: (id: string) => `/me/orders/${id}/reschedule`,
    cancel: (id: string) => `/me/orders/${id}/cancel`,
    availableSlots: '/me/orders/available-slots',
    preview: '/me/orders/preview',
    mineWorkOrder: (orderId: string) => `/me/orders/${orderId}/work-order`,
  },
  /** Báo cáo quản trị / phân tích vận hành - BE `DashboardController` (@Controller('admin/dashboard')). */
  adminDashboard: {
    report: '/admin/dashboard',
  },
  /** Đơn phía quầy/quản trị - BE `AdminOrderController` (@Controller('admin/orders')). */
  adminOrders: {
    list: '/admin/orders',
    byId: (id: string) => `/admin/orders/${id}`,
    status: (id: string) => `/admin/orders/${id}/status`,
    markPaid: (id: string) => `/admin/orders/${id}/mark-paid`,
  },
  /** Quản lý Work Orders cho Cashier/Manager - BE `AdminWorkOrderController` */
  adminWorkOrders: {
    list: '/admin/work-orders',
    create: '/admin/work-orders',
    byId: (id: string) => `/admin/work-orders/${id}`,
    assign: (id: string) => `/admin/work-orders/${id}/assign`,
    queue: '/admin/work-orders/queue',
  },
  /** Work Orders cho thợ rửa xe - BE `WasherWorkOrderController` */
  washerWorkOrders: {
    list: '/me/work-orders',
    byId: (id: string) => `/me/work-orders/${id}`,
    start: (id: string) => `/me/work-orders/${id}/start`,
    finish: (id: string) => `/me/work-orders/${id}/finish`,
  },
  serviceTypes: {
    list: '/service-types',
    byId: (id: string) => `/service-types/${id}`,
  },
  adminServiceTypes: {
    list: '/admin/service-types',
    create: '/admin/service-types',
    byId: (id: string) => `/admin/service-types/${id}`,
    status: (id: string) => `/admin/service-types/${id}/status`,
  },
  vehicleTypes: {
    list: '/vehicle-types',
    byId: (id: string) => `/vehicle-types/${id}`,
  },
  adminVehicleTypes: {
    list: '/admin/vehicle-types',
    create: '/admin/vehicle-types',
    byId: (id: string) => `/admin/vehicle-types/${id}`,
    status: (id: string) => `/admin/vehicle-types/${id}/status`,
  },
  vehicles: {
    mine: '/me/vehicles',
    byId: (id: string) => `/me/vehicles/${id}`,
    setDefault: (id: string) => `/me/vehicles/${id}/set-default`,
  },
  adminVehicles: {
    list: '/admin/vehicles',
    byId: (id: string) => `/admin/vehicles/${id}`,
  },
  shifts: {
    available: '/shifts/available',
  },
  adminShifts: {
    list: '/admin/shifts',
    create: '/admin/shifts',
    byId: (id: string) => `/admin/shifts/${id}`,
    status: (id: string) => `/admin/shifts/${id}/status`,
    staff: '/admin/shifts/staff',
    staffStats: '/admin/shifts/staff-stats',
  },
  loyalty: {
    mine: '/me/loyalty',
    transactions: '/me/loyalty/transactions',
  },
  vouchers: {
    mine: '/me/vouchers',
    byId: (id: string) => `/me/vouchers/${id}`,
    claim: '/me/vouchers/claim',
  },
  notifications: {
    list: '/me/notifications',
    unreadCount: '/me/notifications/unread-count',
    read: (id: string) => `/me/notifications/${id}/read`,
    readAll: '/me/notifications/read-all',
  },
  adminVouchers: {
    list: '/admin/vouchers',
    create: '/admin/vouchers',
    bulk: '/admin/vouchers/bulk',
    stats: '/admin/vouchers/stats',
    batches: '/admin/vouchers/batches',
    byId: (id: string) => `/admin/vouchers/${id}`,
    revoke: (id: string) => `/admin/vouchers/${id}/revoke`,
  },
  /** Chiến dịch voucher, bản công khai - BE `VoucherCampaignController`. */
  voucherCampaigns: {
    byId: (id: string) => `/voucher-campaigns/${id}`,
  },
  /** Chiến dịch voucher phía quản trị - BE `AdminVoucherCampaignController`. */
  adminVoucherCampaigns: {
    list: '/admin/voucher-campaigns',
    create: '/admin/voucher-campaigns',
    byId: (id: string) => `/admin/voucher-campaigns/${id}`,
    activate: (id: string) => `/admin/voucher-campaigns/${id}/activate`,
    pause: (id: string) => `/admin/voucher-campaigns/${id}/pause`,
    end: (id: string) => `/admin/voucher-campaigns/${id}/end`,
    stats: (id: string) => `/admin/voucher-campaigns/${id}/stats`,
  },
  tierConfigs: {
    list: '/tier-configs',
    byId: (id: string) => `/tier-configs/${id}`,
  },
  adminTierConfigs: {
    list: '/admin/tier-configs',
    byId: (id: string) => `/admin/tier-configs/${id}`,
    status: (id: string) => `/admin/tier-configs/${id}/status`,
  },
  adminUsers: {
    list: '/admin/users',
    create: '/admin/users',
    byId: (id: string) => `/admin/users/${id}`,
    role: (id: string) => `/admin/users/${id}/role`,
    status: (id: string) => `/admin/users/${id}/status`,
    resetPassword: (id: string) => `/admin/users/${id}/reset-password`,
  },
  chat: {
    message: '/chat/message',
    session: (sessionId: string) => `/chat/sessions/${sessionId}`,
  },
  adminChatKnowledge: {
    list: '/admin/chat-knowledge',
    create: '/admin/chat-knowledge',
    byId: (id: string) => `/admin/chat-knowledge/${id}`,
  },
  payments: {
    webhook: '/payments/webhook',
  },
  adminGoldenHours: {
    list: '/admin/golden-hours',
    create: '/admin/golden-hours',
    byId: (id: string) => `/admin/golden-hours/${id}`,
  },
  adminPricingPolicy: {
    get: '/admin/pricing-policy',
    update: '/admin/pricing-policy',
  },
  washerSchedule: {
    me: '/washers/me/schedule',
  },
  feedback: {
    submit: '/me/feedback',
    byOrderId: (orderId: string) => `/me/feedback/${orderId}`,
  },
  adminFeedback: {
    list: '/admin/feedback',
    washerSummary: (washerId: string) => `/admin/feedback/washers/${washerId}/summary`,
  },
  upload: {
    image: '/upload/image',
    images: '/upload/images',
  },
  health: '/health',
} as const;
