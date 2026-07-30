import { axiosInstance } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { ENDPOINTS } from '@/services/endpoints';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export const useLogout = () => {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useCallback(
    async (redirectTo: string = '/') => {
      const { refreshToken } = useAuthStore.getState();
      try {
        // BE validate refreshToken phải là JWT không rỗng -> gọi API chỉ khi
        // thực sự có token. Phiên cũ (đăng nhập trước khi FE lưu refreshToken)
        // hoặc đăng ký xong chưa có token thì bỏ qua, tránh 400 Bad Request.
        if (refreshToken) {
          await axiosInstance.post(ENDPOINTS.auth.logout, { refreshToken });
        }
      } catch {
        // BE lỗi vẫn phải xoá phiên phía client.
      } finally {
        clearSession();
        router.replace(redirectTo);
      }
    },
    [clearSession, router],
  );
};
