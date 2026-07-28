import { axiosInstance } from '@/lib/axios';
import { useMutation } from '@tanstack/react-query';
import { AuthResponse, UserLogin } from '@/types/auth';
import { ENDPOINTS } from '@/services/endpoints';

export const useLogin = () => {
  return useMutation({
    mutationFn: async (data: UserLogin): Promise<AuthResponse> => {
      const res = await axiosInstance.post<AuthResponse>(
        ENDPOINTS.auth.login,
        data,
      );
      if (!res.data) {
        throw new Error('Login failed');
      }
      return res.data;
    },
  });
};
