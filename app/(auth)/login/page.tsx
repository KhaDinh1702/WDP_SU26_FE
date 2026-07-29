'use client';

import { Suspense } from 'react';
import axios from 'axios';
import { LoginForm } from '@/components/auth/LoginForm';
import { useLogin } from '@/hooks/auth/useLogin';
import { LoginFormData } from '@/schemas/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getRoleHome } from '@/constants';
import { Spinner } from '@/components/ui/spinner';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      onError: (error) => {
        // BE trả 403 "Email not verified" cho tài khoản đăng ký xong nhưng chưa
        // nhập OTP. Đây KHÔNG phải sai mật khẩu - đưa khách sang bước xác minh
        // thay vì báo sai thông tin đăng nhập.
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          toast.info('Email của bạn chưa được xác minh.');
          router.push(
            `/verify-email?email=${encodeURIComponent(data.email)}`,
          );
          return;
        }
        toast.error('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      },
    });
  };

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={login.isPending}
      defaultEmail={searchParams.get('email') ?? ''}
    />
  );
}

function LoginPage() {
  return (
    <div className='relative flex-1 overflow-hidden bg-[#f6f8fb]'>
      <div className='pointer-events-none absolute -top-32 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-sky-200/50 blur-[120px]' />
      <div className='pointer-events-none absolute -bottom-45 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-[120px]' />

      <div className='relative z-10 flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          {/* useSearchParams cần Suspense boundary khi build tĩnh. */}
          <Suspense
            fallback={
              <div className='flex justify-center py-20'>
                <Spinner className='size-8 text-primary' />
              </div>
            }
          >
            <LoginPageContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
