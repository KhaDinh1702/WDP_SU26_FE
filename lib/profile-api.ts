import { axiosInstance } from '@/lib/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { User } from '@/types/auth';

/** Trường tự sửa được — khớp BE UpdateUserDto (email/role không đổi ở đây). */
export interface UpdateMyProfileInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  /** ISO date, ví dụ '1995-01-15'. */
  dateOfBirth?: string;
}

/** Hồ sơ đầy đủ của người đang đăng nhập (mọi role). */
export const getMyProfile = () => axiosInstance.get<User>(ENDPOINTS.profile.me);

export const updateMyProfile = (data: UpdateMyProfileInput) =>
  axiosInstance.patch<User>(ENDPOINTS.profile.me, data);

export const changeMyPassword = (data: {
  oldPassword: string;
  newPassword: string;
}) =>
  axiosInstance.post<{ message: string }>(
    ENDPOINTS.profile.changePassword,
    data,
  );
