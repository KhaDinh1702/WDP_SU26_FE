import { buildGoogleRedirectUrl, googleLogin } from '@/lib/customer-api';
import { AuthResponse, GoogleLoginDto } from '@/types/auth';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Luồng SPA — POST /auth/google với Google **id_token** lấy từ Google Identity
 * Services ở phía client. BE tạo tài khoản ở lần gọi đầu và đăng nhập ở các lần
 * sau; không có endpoint "đăng ký Google" riêng.
 *
 * Dùng khi trang đã tự lấy được id_token. Nếu không, dùng
 * `useGoogleRedirectLogin` bên dưới — luồng redirect không cần thư viện client.
 */
export const useGoogleLogin = () => {
  return useMutation({
    mutationFn: async (data: GoogleLoginDto): Promise<AuthResponse> => {
      const res = await googleLogin(data);
      return res.data;
    },
  });
};

/**
 * Luồng redirect — điều hướng cả trình duyệt sang GET /auth/google.
 * Không dùng fetch/axios: BE trả 302 sang màn hình đồng ý của Google.
 * Token quay về ở fragment của URL callback, xem `app/auth/google/callback`.
 */
export const useGoogleRedirectLogin = () => {
  return useCallback((redirectPath: string = '/auth/google/callback') => {
    const redirect =
      typeof window !== 'undefined'
        ? new URL(redirectPath, window.location.origin).toString()
        : undefined;
    window.location.href = buildGoogleRedirectUrl(redirect);
  }, []);
};
