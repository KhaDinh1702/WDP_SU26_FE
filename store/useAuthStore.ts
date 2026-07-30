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
        const { refreshToken } = get();
        if (!refreshToken) return null;

        try {
          // POST /auth/refresh → AuthResponse (accessToken + refreshToken + user).
          const res = await axiosInstance.post<AuthResponse>(
            ENDPOINTS.auth.refresh,
            { refreshToken },
          );
          const { accessToken, refreshToken: newRefreshToken, user } = res.data;
          set({
            accessToken,
            ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
            ...(user ? { authUser: user } : {}),
          });
          return accessToken;
        } catch (error) {
          set({ authUser: null, accessToken: null, refreshToken: null });
          throw error;
        }
      },

      /**
       * Hồ sơ đầy đủ lấy từ GET /me/profile (`UserResponse`).
       * KHÔNG dùng GET /auth/me: endpoint đó chỉ trả payload của access token
       * (`{ sub, email, role }`), không có name/phone/avatarUrl/dateOfBirth.
       */
      getUser: async (): Promise<User | null> => {
        const token = get().accessToken;
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
          if (
            (err as { response?: { status?: number } })?.response?.status ===
            401
          ) {
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
