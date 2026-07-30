import { z } from 'zod';

const currentYear = new Date().getFullYear();

/** Giới hạn mật khẩu của BE: `minLength: 8`, `maxLength: 72` (bcrypt). */
const passwordField = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự');

export const registerSchema = z
  .object({
    email: z.email('Vui lòng nhập đúng định dạng email'),

    password: passwordField,

    name: z
      .string()
      .min(2, 'Họ tên cần ít nhất 2 ký tự')
      .max(50, 'Họ tên tối đa 50 ký tự'),

    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),

    dateOfBirth: z
      .date({ error: 'Vui lòng chọn ngày sinh' })
      .min(new Date(1900, 0, 1), 'Năm sinh không hợp lệ')
      .max(
        new Date(currentYear - 15, 11, 31),
        'Bạn phải từ 15 tuổi trở lên để đăng ký',
      ),

    phone: z
      .string()
      .min(10, 'Số điện thoại phải có ít nhất 10 chữ số')
      .max(10, 'Số điện thoại không được vượt quá 10 chữ số')
      .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại không đúng định dạng'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.email('Vui lòng nhập đúng định dạng email'),

  // BE chỉ chặn `maxLength: 72` khi đăng nhập - độ dài tối thiểu là luật của
  // form đăng ký, không phải của endpoint này.
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(72, 'Mật khẩu tối đa 72 ký tự'),
});

/** POST /auth/forgot-password. */
export const forgotPasswordSchema = z.object({
  email: z.email('Vui lòng nhập đúng định dạng email'),
});

/** POST /auth/otp/verify - `OtpVerify.code` là chuỗi đúng 6 ký tự. */
export const verifyOtpSchema = z.object({
  code: z
    .string()
    .length(6, 'Mã xác minh gồm đúng 6 chữ số')
    .regex(/^\d{6}$/, 'Mã xác minh chỉ gồm chữ số'),
});

/** POST /auth/reset-password - mã 6 số gửi qua email, dùng một lần. */
export const resetPasswordSchema = z
  .object({
    email: z.email('Vui lòng nhập đúng định dạng email'),

    code: z
      .string()
      .length(6, 'Mã xác thực gồm đúng 6 chữ số')
      .regex(/^\d{6}$/, 'Mã xác thực chỉ gồm chữ số'),

    newPassword: passwordField,

    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

/** POST /me/profile/change-password - `ChangeMyPassword`. */
export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu hiện tại')
      .max(72, 'Mật khẩu tối đa 72 ký tự'),

    newPassword: passwordField,

    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

/**
 * PATCH /me/profile - `UpdateUser`. Email KHÔNG sửa được qua endpoint này.
 * Tài khoản đăng nhập bằng Google chưa có số điện thoại, nên phone để trống được
 * và chỉ kiểm định dạng khi khách có nhập.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Họ tên cần ít nhất 2 ký tự')
    .max(100, 'Họ tên tối đa 100 ký tự'),

  phone: z
    .string()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại không đúng định dạng')
    .or(z.literal('')),

  dateOfBirth: z
    .date()
    .min(new Date(1900, 0, 1), 'Năm sinh không hợp lệ')
    .max(new Date(currentYear - 15, 11, 31), 'Bạn phải từ 15 tuổi trở lên')
    .optional(),
});

export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(2, 'Họ tên cần ít nhất 2 ký tự')
    .max(50, 'Họ tên tối đa 50 ký tự'),

  email: z.email('Email không hợp lệ'),

  dateOfBirth: z
    .date()
    .min(new Date(1900, 0, 1), 'Năm sinh không hợp lệ')
    .max(new Date(currentYear - 15, 11, 31), 'Bạn phải từ 15 tuổi trở lên'),

  phone: z
    .string()
    .min(10, 'Số điện thoại phải có ít nhất 10 chữ số')
    .max(10, 'Số điện thoại không được vượt quá 10 chữ số')
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại không đúng định dạng'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type UpdateAccountFormData = z.infer<typeof updateAccountSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
