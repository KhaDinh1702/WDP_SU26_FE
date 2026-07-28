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
        // POST /auth/logout thu hồi refresh token; body BẮT BUỘC có refreshToken
        // nên không có token thì bỏ qua luôn, chỉ dọn phiên phía client.
        if (refreshToken) {
          await axiosInstance.post(ENDPOINTS.auth.logout, { refreshToken });
        }
      } catch {
        // ignore
      } finally {
        clearSession();
        router.replace(redirectTo);
      }
    },
    [clearSession, router],
  );
};
