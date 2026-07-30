/**
 * Model xác thực - mirror Swagger BE (https://wash-auto.vercel.app/api/docs.json):
 * `Register`, `Login`, `GoogleLogin`, `RefreshToken`, `AuthResponse`, `AuthPayload`,
 * `UserResponse`, `Otp*`, `ForgotPassword`, `ResetPassword`, `UpdateUser`,
 * `ChangeMyPassword`, `MessageResponse`.
 * KHÔNG thêm field không có trong Swagger.
 */
import type { Role } from '@/constants/roles';

/** POST /auth/register - `Register`. dateOfBirth là chuỗi `YYYY-MM-DD` và tuỳ chọn. */
export type UserRegister = {
  name: string;
  phone: string;
  email: string;
  password: string;
  dateOfBirth?: string;
};

/** POST /auth/login - `Login`. */
export type UserLogin = {
  email: string;
  password: string;
};

/**
 * POST /auth/google - `GoogleLogin`.
 * `idToken` là Google **id_token** (JWT do Google Identity Services trả về),
 * KHÔNG phải access_token: chỉ id_token mới mang claim danh tính có chữ ký.
 * BE tự đăng ký tài khoản ở lần gọi đầu nên không có endpoint "google register" riêng.
 */
export type GoogleLoginDto = {
  idToken: string;
};

/** POST /auth/refresh và POST /auth/logout - `RefreshToken`. */
export type RefreshTokenDto = {
  refreshToken: string;
};

/**
 * `UserResponse` - user kèm trong AuthResponse và GET/PATCH /me/profile.
 * Mọi field ngoài `id` đều có thể vắng: tài khoản tạo qua Google chưa có phone.
 */
export type User = {
  id: string;
  role: Role | string;
  name: string;
  email: string;
  /** Tài khoản Google chưa có số điện thoại cho tới khi khách bổ sung qua PATCH /me/profile. */
  phone?: string;
  avatarUrl?: string;
  /** ISO date-time string (BE trả `2026-01-15T00:00:00.000Z`). */
  dateOfBirth?: string;
  isActive?: boolean;

  /**
   * @deprecated Không có trong `UserResponse` của Swagger hiện tại.
   * Giữ lại vì Navbar còn dùng làm fallback khi chưa tải xong GET /me/loyalty.
   */
  tier?: string;
  /** @deprecated Xem `tier`. Nguồn chuẩn là GET /me/loyalty. */
  loyaltyPoints?: number;
};

/** `AuthResponse` - trả về bởi register / login / google / refresh. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * `AuthPayload` - payload của access token, trả về bởi GET /auth/me.
 * Đây KHÔNG phải hồ sơ đầy đủ: muốn lấy hồ sơ dùng GET /me/profile.
 */
export interface AuthPayload {
  sub: string;
  email: string;
  role: Role | string;
}

/** `MessageResponse` - forgot-password / reset-password / change-password. */
export interface MessageResponse {
  message: string;
}

export interface OtpSendDto {
  email: string;
}

export interface OtpSendResponse {
  message: string;
  /** Chỉ có khi email đã được xác thực trong cửa sổ thời gian cho phép. */
  token?: string;
}

export interface OtpVerifyDto {
  email: string;
  code: string; // 6-digit verification code
}

export interface OtpVerifyResponse {
  token: string; // JWT scope=email_verified (15m TTL)
}

/** POST /auth/forgot-password - `ForgotPassword`. */
export interface ForgotPasswordDto {
  email: string;
}

/** POST /auth/reset-password - `ResetPassword`. `code` là mã 6 số gửi qua email. */
export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

/** PATCH /me/profile - `UpdateUser`. Mọi field đều tuỳ chọn. */
export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  /** `YYYY-MM-DD`. */
  dateOfBirth?: string;
}

/** POST /me/profile/change-password - `ChangeMyPassword`. */
export interface ChangeMyPasswordDto {
  oldPassword: string;
  newPassword: string;
}
