import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Đã thử lại sau khi refresh chưa - chặn retry vòng hai. */
    _retry?: boolean;
    /** Access token đã gắn cho request này, để nhận ra token đã bị rotate. */
    _accessToken?: string;
    /** Đã gọi lại bằng token mới hơn trong store chưa (chưa refresh). */
    _tokenSwapped?: boolean;
  }
}

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    // Endpoint không cần Bearer token (Swagger: không có `security`).
    const publicEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/google',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/otp/send',
      '/auth/otp/verify',
    ];
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint),
    );
    if (accessToken && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      config._accessToken = accessToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/logout')
    ) {
      const { accessToken, refreshAccessToken } = useAuthStore.getState();

      // Request đang bay lúc token được rotate thì về 401 với token đã cũ.
      // Trong store đã có token mới rồi - gọi lại ngay, đừng rotate thêm một
      // vòng (mỗi vòng rotate là một dịp để hai refresh chồng nhau). Chỉ đổi
      // token một lần; token mới mà vẫn 401 thì rơi xuống nhánh refresh.
      if (
        accessToken &&
        originalRequest._accessToken &&
        originalRequest._accessToken !== accessToken &&
        !originalRequest._tokenSwapped
      ) {
        originalRequest._tokenSwapped = true;
        return axiosInstance(originalRequest);
      }

      // Đánh dấu TRƯỚC khi gọi lại: mỗi request chỉ được refresh + thử lại đúng
      // một lần. (Hàng đợi cũ chỉ set cờ này cho request "dẫn đầu", nên request
      // đi kèm mà 401 lần nữa là lại vào đây và kích thêm một vòng refresh.)
      originalRequest._retry = true;

      // `refreshAccessToken` tự gộp các lời gọi song song, nên N request 401
      // cùng lúc chỉ sinh ra đúng 1 POST /auth/refresh - không còn cảnh hai
      // request cùng gửi một refresh token rồi ăn 401 "Refresh token revoked".
      try {
        const newToken = await refreshAccessToken();
        if (!newToken) return Promise.reject(error);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
