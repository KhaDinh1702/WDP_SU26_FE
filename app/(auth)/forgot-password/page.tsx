'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { useForgotPassword } from '@/hooks/auth/usePasswordReset';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { ForgotPasswordFormData, forgotPasswordSchema } from '@/schemas/auth';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  const handleSubmit = (data: ForgotPasswordFormData) => {
    forgot.mutate(data, {
      // BE cố tình trả cùng một thông điệp dù email có tài khoản hay không, để
      // không ai dò được danh sách người dùng - nên đừng nói "email tồn tại".
      onSuccess: () => setSentTo(data.email),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className='relative flex-1 overflow-hidden bg-[#f6f8fb]'>
      <div className='pointer-events-none absolute -top-32 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-sky-200/50 blur-[120px]' />
      <div className='pointer-events-none absolute -bottom-45 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-[120px]' />

      <div className='relative z-10 flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          <Card className='border-primary/10 bg-white/80 px-4 py-10 shadow-2xl shadow-primary/5 backdrop-blur-xl'>
            <CardHeader className='space-y-1 pb-6 text-center'>
              <CardTitle className='font-sans text-3xl font-bold tracking-tight text-primary'>
                Quên mật khẩu
              </CardTitle>
              <p className='text-sm font-medium text-muted-foreground'>
                {sentTo
                  ? 'Kiểm tra hộp thư của bạn'
                  : 'Nhập email để nhận mã đặt lại mật khẩu'}
              </p>
            </CardHeader>

            <CardContent>
              {sentTo ? (
                <div className='flex flex-col gap-5'>
                  <div className='flex items-start gap-3 rounded-xl border border-primary/20 bg-accent p-4'>
                    <MailCheck className='mt-0.5 size-5 shrink-0 text-primary' />
                    <p className='text-sm text-foreground'>
                      Nếu <span className='font-semibold'>{sentTo}</span> có tài
                      khoản, chúng tôi đã gửi mã đặt lại gồm 6 chữ số. Mã chỉ
                      dùng được một lần.
                    </p>
                  </div>

                  <Button
                    size='xl'
                    className='w-full rounded-xl shadow-lg shadow-primary/20'
                    onClick={() =>
                      router.push(
                        `/reset-password?email=${encodeURIComponent(sentTo)}`,
                      )
                    }
                  >
                    Tôi đã có mã
                  </Button>

                  <button
                    type='button'
                    onClick={() => setSentTo(null)}
                    className='text-sm font-medium text-muted-foreground hover:text-primary'
                  >
                    Gửi lại cho email khác
                  </button>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                  <FieldGroup className='gap-5'>
                    <AuthFormField
                      control={form.control}
                      name='email'
                      id='forgot-email'
                      label='Email'
                      icon={Mail}
                      type='email'
                      placeholder='email@example.com'
                      autoComplete='email'
                      disabled={forgot.isPending}
                    />

                    <Button
                      type='submit'
                      size='xl'
                      disabled={forgot.isPending}
                      aria-busy={forgot.isPending}
                      className='w-full rounded-xl shadow-lg shadow-primary/20'
                    >
                      {forgot.isPending && <Spinner />}
                      {forgot.isPending ? 'Đang gửi...' : 'Gửi mã đặt lại'}
                    </Button>
                  </FieldGroup>
                </form>
              )}

              <button
                type='button'
                onClick={() => router.push('/login')}
                className='mt-6 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary'
              >
                <ArrowLeft className='size-4' /> Quay lại đăng nhập
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
