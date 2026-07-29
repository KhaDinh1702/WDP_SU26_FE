import { axiosInstance } from '@/lib/axios';
import { User, UserRegister } from '@/types/auth';
import { useMutation } from '@tanstack/react-query';
import { ENDPOINTS } from '@/services/endpoints';

/**
 * POST /auth/register.
 *
 * CHÚ Ý: Swagger khai báo 201 trả `AuthResponse` (kèm accessToken/refreshToken),
 * nhưng BE thực tế trả `UserResponse` và KHÔNG có token nào - tài khoản sinh ra
 * ở trạng thái `isActive: false` cho tới khi xác minh email. Đăng nhập trước khi
 * xác minh bị chặn bằng 403 "Email not verified".
 * → Đăng ký xong phải đi qua bước OTP rồi mới đăng nhập được.
 */
export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: UserRegister): Promise<User> => {
      const res = await axiosInstance.post<User>(
        ENDPOINTS.auth.register,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.data) {
        throw new Error('Register failed');
      }

      return res.data;
    },
  });
};
