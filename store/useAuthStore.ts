import { axiosInstance } from '@/lib/axios';
import { ENDPOINTS } from '@/services/endpoints';
import { AuthResponse, User } from '@/types/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  authUser: User | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  /** Lưu cả cặp token sau login/register/google trong một lần set. */
  setSession: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
    user?: User | null;
  }) => void;
  clearSession: () => void;
  refreshAccessToken: () => Promise<string | null>;
  getUser: () => Promise<User | null>;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Lần refresh đang bay, dùng chung cho MỌI caller.
 *
 * BE rotate refresh token: cấp token mới xong thì coi token cũ là revoked. Nên
 * hai request `POST /auth/refresh` chạy song song sẽ cùng gửi một refresh token
 * — cái về sau nhận 401 "Refresh token revoked" và làm mất cả phiên. Trước đây
 * interceptor axios có hàng đợi riêng, nhưng `NotificationSocketBridge` gọi
 * `refreshAccessToken()` trực tiếp khi socket báo token hết hạn nên nằm ngoài
 * hàng đợi đó → đúng thời điểm access token hết hạn, REST và socket cùng
 * refresh và khách bị đăng xuất.
 *
 * Gộp ở đây thì mọi caller (interceptor, socket bridge, chỗ nào thêm sau) đều
 * chung một lần gọi. Để ngoài state của zustand vì không cần render lại.
 */
let inFlightRefresh: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authUser: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setUser: (user) => set({ authUser: user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setRefreshToken: (token) => set({ refreshToken: token }),

      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          ...(refreshToken ? { refreshToken } : {}),
          ...(user ? { authUser: user } : {}),
        }),

      clearSession: () =>
        set({ authUser: null, accessToken: null, refreshToken: null }),

      refreshAccessToken: async () => {
        // Đã có người refresh → đi ké, đừng gửi thêm request với token cũ.
        if (inFlightRefresh) return inFlightRefresh;

        const { refreshToken } = get();
        if (!refreshToken) return null;

        inFlightRefresh = (async () => {
          try {
            // POST /auth/refresh → AuthResponse (accessToken + refreshToken + user).
            const res = await axiosInstance.post<AuthResponse>(
              ENDPOINTS.auth.refresh,
              { refreshToken },
            );
            const {
              accessToken,
              refreshToken: newRefreshToken,
              user,
            } = res.data;
            // Refresh 200 trả về đủ một phiên mới (accessToken + refreshToken +
            // user) nên dựng lại phiên y như lúc đăng nhập - dùng chung
            // `setSession` với login/register/google để chỉ có MỘT chỗ định
            // nghĩa "đã đăng nhập". Quan trọng nhất là `authUser` được set lại:
            // ProtectedRoute và AuthLayout xét đăng nhập bằng `authUser`, còn
            // token thì mất user là bị đẩy về /login dù phiên vẫn sống.
            get().setSession({
              accessToken,
              refreshToken: newRefreshToken,
              user,
            });
            return accessToken;
          } catch (error) {
            // Chỉ xoá phiên khi BE thực sự từ chối refresh token (hết hạn,
            // revoked). Lỗi mạng/timeout/5xx thì token vẫn còn giá trị — xoá
            // phiên ở đây là đá khách ra ngoài chỉ vì wifi lag.
            const status = (error as { response?: { status?: number } })
              ?.response?.status;
            if (status === 401 || status === 403) {
              set({ authUser: null, accessToken: null, refreshToken: null });
            }
            throw error;
          } finally {
            inFlightRefresh = null;
          }
        })();

        return inFlightRefresh;
      },

      /**
       * Hồ sơ đầy đủ lấy từ GET /me/profile (`UserResponse`).
       * KHÔNG dùng GET /auth/me: endpoint đó chỉ trả payload của access token
       * (`{ sub, email, role }`), không có name/phone/avatarUrl/dateOfBirth.
       */
      getUser: async (): Promise<User | null> => {
        let token = get().accessToken;
        // Mất accessToken nhưng còn refreshToken (phiên bị dọn nửa vời, hoặc
        // tab khác vừa xoá access token): xin phiên mới rồi đi tiếp, đừng coi
        // như đã đăng xuất - refresh trả về cả user nên đủ để đăng nhập lại.
        if (!token && get().refreshToken) {
          token = await get()
            .refreshAccessToken()
            .catch(() => null);
        }
        if (!token) return null;
        try {
          const res = await axiosInstance.get<User>(ENDPOINTS.profile.me);
          const fetchedUser = res.data;

          if (fetchedUser && typeof fetchedUser === 'object') {
            const mergedUser = { ...get().authUser, ...fetchedUser };
            set({ authUser: mergedUser });
            return mergedUser;
          }
          return null;
        } catch (err) {
          // Tới được đây là interceptor đã thử refresh và không cứu được.
          // Chỉ dọn phiên khi trong store cũng không còn refreshToken - tức hết
          // đường cứu. Còn refreshToken thì để yên: lỗi có thể chỉ là mạng hoặc
          // 5xx, và `refreshAccessToken` mới là nơi được kết luận phiên đã chết.
          const status = (err as { response?: { status?: number } })?.response
            ?.status;
          if (status === 401 && !get().refreshToken) {
            set({ authUser: null, accessToken: null, refreshToken: null });
          }
          return null;
        }
      },
    }),

    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        authUser: state.authUser,
      }),
    },
  ),
);
