import { forgotPassword, resetPassword } from '@/lib/customer-api';
import {
  ForgotPasswordDto,
  MessageResponse,
  ResetPasswordDto,
} from '@/types/auth';
import { useMutation } from '@tanstack/react-query';

/**
 * POST /auth/forgot-password — BE luôn trả 200 với cùng một thông điệp dù email
 * có tồn tại hay không, nên KHÔNG suy ra sự tồn tại của tài khoản từ kết quả.
 * 429 = quá 5 lần/giờ cho email đó.
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (data: ForgotPasswordDto): Promise<MessageResponse> => {
      const res = await forgotPassword(data);
      return res.data;
    },
  });
};

/**
 * POST /auth/reset-password — tiêu thụ mã 6 số dùng một lần từ forgot-password.
 * Sai 5 lần là mã cháy. Thành công thì mọi phiên khác bị đăng xuất.
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (data: ResetPasswordDto): Promise<MessageResponse> => {
      const res = await resetPassword(data);
      return res.data;
    },
  });
};
