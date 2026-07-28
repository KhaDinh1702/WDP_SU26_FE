'use client';

import { Suspense, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Hash, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { useResetPassword } from '@/hooks/auth/usePasswordReset';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { ResetPasswordFormData, resetPasswordSchema } from '@/schemas/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reset = useResetPassword();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Email được trang quên mật khẩu chuyển sang qua query string.
  const emailFromQuery = searchParams.get('email');
  useEffect(() => {
    if (emailFromQuery) {
      form.setValue('email', emailFromQuery, { shouldValidate: false });
    }
  }, [emailFromQuery, form]);

  const handleSubmit = (data: ResetPasswordFormData) => {
    // `confirmPassword` chỉ dùng để đối chiếu ở form, không nằm trong `ResetPassword`.
    reset.mutate(
      {
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          // BE thu hồi mọi refresh token cũ, nên các phiên khác phải đăng nhập lại.
          toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
          router.replace('/login');
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Card className='border-primary/10 bg-white/80 px-4 py-10 shadow-2xl shadow-primary/5 backdrop-blur-xl'>
      <CardHeader className='space-y-1 pb-6 text-center'>
        <CardTitle className='font-sans text-3xl font-bold tracking-tight text-primary'>
          Đặt lại mật khẩu
        </CardTitle>
        <p className='text-sm font-medium text-muted-foreground'>
          Nhập mã 6 chữ số đã gửi tới email của bạn
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className='gap-5'>
            <AuthFormField
              control={form.control}
              name='email'
              id='reset-email'
              label='Email'
              icon={Mail}
              type='email'
              placeholder='email@example.com'
              autoComplete='email'
              disabled={reset.isPending}
            />
            <AuthFormField
              control={form.control}
              name='code'
              id='reset-code'
              label='Mã xác thực'
              icon={Hash}
              placeholder='123456'
              autoComplete='one-time-code'
              disabled={reset.isPending}
            />
            <AuthFormField
              control={form.control}
              name='newPassword'
              id='reset-new-password'
              label='Mật khẩu mới'
              icon={Lock}
              type='password'
              placeholder='Mật khẩu mới'
              autoComplete='new-password'
              disabled={reset.isPending}
            />
            <AuthFormField
              control={form.control}
              name='confirmPassword'
              id='reset-confirm-password'
              label='Xác nhận mật khẩu'
              icon={Lock}
              type='password'
              placeholder='Nhập lại mật khẩu mới'
              autoComplete='new-password'
              disabled={reset.isPending}
            />

            <Button
              type='submit'
              size='xl'
              disabled={reset.isPending}
              aria-busy={reset.isPending}
              className='w-full rounded-xl shadow-lg shadow-primary/20'
            >
              {reset.isPending && <Spinner />}
              {reset.isPending ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </Button>

            <p className='text-center text-xs text-muted-foreground'>
              Mã chỉ dùng được một lần và sẽ bị vô hiệu sau 5 lần nhập sai.
            </p>
          </FieldGroup>
        </form>

        <div className='mt-6 flex items-center justify-between text-sm font-semibold'>
          <button
            type='button'
            onClick={() => router.push('/login')}
            className='inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary'
          >
            <ArrowLeft className='size-4' /> Đăng nhập
          </button>
          <button
            type='button'
            onClick={() => router.push('/forgot-password')}
            className='text-primary hover:underline'
          >
            Gửi lại mã
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
