import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from '@/lib/customer-api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  ChangeMyPasswordDto,
  MessageResponse,
  UpdateProfileDto,
  User,
} from '@/types/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** GET /me/profile — hồ sơ đầy đủ (`UserResponse`) của người đang đăng nhập. */
export const useMyProfile = () => {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async (): Promise<User> => {
      const res = await getMyProfile();
      return res.data;
    },
    enabled: !!accessToken,
  });
};

/**
 * PATCH /me/profile — mọi field tuỳ chọn; email không sửa được ở đây.
 * 409 = số điện thoại đã có tài khoản khác dùng.
 */
export const useUpdateMyProfile = () => {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (data: UpdateProfileDto): Promise<User> => {
      const res = await updateMyProfile(data);
      return res.data;
    },
    onSuccess: (user) => {
      setUser(user);
      qc.setQueryData(['my-profile'], user);
    },
  });
};

/** POST /me/profile/change-password — cần đúng mật khẩu hiện tại. */
export const useChangeMyPassword = () => {
  return useMutation({
    mutationFn: async (data: ChangeMyPasswordDto): Promise<MessageResponse> => {
      const res = await changeMyPassword(data);
      return res.data;
    },
  });
};
