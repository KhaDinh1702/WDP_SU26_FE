'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useLogin } from '@/hooks/auth/useLogin';
import { LoginFormData } from '@/schemas/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getRoleHome } from '@/constants';

function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const setSession = useAuthStore((s) => s.setSession);

  const handleSubmit = async (data: LoginFormData): Promise<void> => {
    login.mutate(data, {
      // POST /auth/login → `AuthResponse` { accessToken, refreshToken, user }.
      onSuccess: (res) => {
        setSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
        });
        router.replace(getRoleHome(res.user?.role));
        toast.success('Đăng nhập thành công!');
      },
      onError: () => {
        toast.error('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      },
    });
  };

  return (
    <div className='relative flex-1 overflow-hidden bg-[#f6f8fb]'>
      <div className='pointer-events-none absolute -top-32 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-sky-200/50 blur-[120px]' />
      <div className='pointer-events-none absolute -bottom-45 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-[120px]' />

      <div className='relative z-10 flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          <LoginForm onSubmit={handleSubmit} loading={login.isPending} />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
