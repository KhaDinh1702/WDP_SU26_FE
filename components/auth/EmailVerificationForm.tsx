'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useSendOtp } from '@/hooks/auth/useSendOtp';
import { useVerifyOtp } from '@/hooks/auth/useVerifyOtp';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { VerifyOtpFormData, verifyOtpSchema } from '@/schemas/auth';

/** Số giây phải chờ giữa hai lần bấm gửi lại mã. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Nhập mã OTP để kích hoạt tài khoản.
 *
 * BE tạo tài khoản ở trạng thái `isActive: false` và chặn đăng nhập bằng 403
 * "Email not verified" cho tới khi xác minh xong, nên đây là bước BẮT BUỘC,
 * không phải tuỳ chọn.
 *
 * KHÔNG tự gọi `POST /auth/otp/send` khi mở màn hình: BE đã gửi mã ngay lúc
 * đăng ký (thông điệp 403 của login nói thẳng "the code sent to your email"),
 * gọi thêm sẽ ra mail thứ hai và làm mã cũ hết hiệu lực. Khách chủ động bấm
 * "Gửi lại mã" nếu không nhận được.
 */
export function EmailVerificationForm({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const form = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    mode: 'onSubmit',
    defaultValues: { code: '' },
  });

  // Đếm ngược cho nút gửi lại.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = () => {
    if (secondsLeft > 0 || sendOtp.isPending) return;
    sendOtp.mutate(
      { email },
      {
        onSuccess: (res) => {
          // `token` chỉ xuất hiện khi email đã xác minh trong cửa sổ cho phép -
          // khi đó không có mã nào được gửi, coi như đã xong.
          if (res?.token) {
            onVerified();
            return;
          }
          setSecondsLeft(RESEND_COOLDOWN_SECONDS);
          toast.success('Đã gửi lại mã xác minh.');
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handleSubmit = (data: VerifyOtpFormData) => {
    verifyOtp.mutate(
      { email, code: data.code },
      {
        onSuccess: () => onVerified(),
        // 400 "Invalid or expired OTP" = mã sai hoặc đã hết hạn.
        onError: (error) => {
          form.setError('code', { message: 'Mã không đúng hoặc đã hết hạn.' });
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const busy = verifyOtp.isPending || sendOtp.isPending;

  return (
    <Card className='border-primary/10 bg-white/80 px-4 py-10 shadow-2xl shadow-primary/5 backdrop-blur-xl'>
      <CardHeader className='space-y-2 pb-6 text-center'>
        <span className='mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
          <MailCheck className='size-6' />
        </span>
        <CardTitle className='font-sans text-3xl font-bold tracking-tight text-primary'>
          Xác minh email
        </CardTitle>
        <p className='text-sm font-medium text-muted-foreground'>
          Nhập mã gồm 6 chữ số đã được gửi tới
        </p>
        <p className='text-sm font-bold break-all text-foreground'>{email}</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className='gap-5'>
            <Controller
              name='code'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className='group relative'>
                    <ShieldCheck className='absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-foreground/30 transition-colors group-focus-within:text-primary' />
                    <Input
                      {...field}
                      id='verify-otp-code'
                      inputMode='numeric'
                      autoComplete='one-time-code'
                      maxLength={6}
                      autoFocus
                      disabled={busy}
                      aria-label='Mã xác minh 6 chữ số'
                      aria-invalid={fieldState.invalid}
                      placeholder='000000'
                      // Chỉ nhận chữ số để khách dán mã kèm khoảng trắng vẫn được.
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.replace(/\D/g, '').slice(0, 6),
                        )
                      }
                      className='h-14 rounded-xl border-primary/10 bg-card pl-11 text-center font-mono text-2xl font-bold tracking-[0.4em] transition-all focus:border-primary focus:ring-primary/20'
                    />
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Button
              type='submit'
              size='xl'
              disabled={busy}
              aria-busy={verifyOtp.isPending}
              className='w-full rounded-xl shadow-lg shadow-primary/20'
            >
              {verifyOtp.isPending && <Spinner />}
              {verifyOtp.isPending ? 'Đang xác minh...' : 'Xác nhận'}
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              Không nhận được mã?{' '}
              <button
                type='button'
                onClick={handleResend}
                disabled={secondsLeft > 0 || busy}
                className='font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline'
              >
                {secondsLeft > 0 ? `Gửi lại sau ${secondsLeft}s` : 'Gửi lại mã'}
              </button>
            </div>

            <p className='text-center text-xs text-muted-foreground'>
              Tài khoản chỉ đăng nhập được sau khi email đã xác minh.
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
