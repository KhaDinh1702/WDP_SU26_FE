'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginFormData, loginSchema } from '@/schemas/auth';
import { useForm } from 'react-hook-form';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { AuthFormField } from './AuthFormField';
import { SocialAuthSection } from './SocialAuthSection';

export function LoginForm({
  className,
  onSubmit,
  loading,
  defaultEmail = '',
  ...props
}: Omit<React.ComponentProps<'div'>, 'onSubmit'> & {
  onSubmit: (data: LoginFormData) => void;
  loading: boolean;
  /** Điền sẵn email, ví dụ khi quay về từ màn hình xác minh email. */
  defaultEmail?: string;
}) {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: defaultEmail,
      password: '',
    },
  });
  const router = useRouter();

  return (
    <div
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <Card className='border-primary/10 bg-white/80 shadow-2xl shadow-primary/5 backdrop-blur-xl px-4 py-10'>
        <CardHeader className='space-y-1 pb-6 text-center'>
          <CardTitle className='font-sans text-3xl font-bold tracking-tight text-primary'>
            Chào mừng trở lại
          </CardTitle>
          <p className='text-sm font-medium text-muted-foreground'>
            Vui lòng đăng nhập để tiếp tục
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className='gap-5'>
              <div className='grid gap-5'>
                <AuthFormField
                  control={form.control}
                  name='email'
                  id='login-email'
                  label='Email'
                  icon={User}
                  type='email'
                  placeholder='email@example.com'
                  autoComplete='email'
                  disabled={loading}
                />
                <AuthFormField
                  control={form.control}
                  name='password'
                  id='login-password'
                  label='Mật khẩu'
                  icon={Lock}
                  type='password'
                  placeholder='Mật khẩu'
                  autoComplete='current-password'
                  disabled={loading}
                />

                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={() => router.push('/forgot-password')}
                    className='cursor-pointer text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline'
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <Button
                  type='submit'
                  size='xl'
                  disabled={loading}
                  aria-busy={loading}
                  className='w-full rounded-xl shadow-lg shadow-primary/20'
                >
                  {loading && <Spinner />}
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </div>

              <SocialAuthSection disabled={loading} />

              <div className='text-center text-sm font-medium text-muted-foreground'>
                Bạn chưa có tài khoản?{' '}
                <button
                  type='button'
                  className='ml-1 font-semibold text-primary hover:underline'
                  onClick={() => router.push('/register')}
                >
                  Tạo tài khoản
                </button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
