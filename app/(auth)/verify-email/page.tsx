'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmailVerificationForm } from '@/components/auth/EmailVerificationForm';

/**
 * Màn hình xác minh email, dùng chung cho hai lối vào:
 *  - vừa đăng ký xong (register không trả token, tài khoản `isActive: false`);
 *  - đăng nhập bị BE chặn bằng 403 "Email not verified".
 *
 * Email đi qua query string để màn hình này reload/chia sẻ link vẫn dùng được.
 */
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email')?.trim();

  if (!email) {
    return (
      <div className='space-y-4 rounded-xl border border-warning/30 bg-warning/10 p-6 text-center'>
        <MailWarning className='mx-auto size-8 text-warning' />
        <h1 className='font-heading text-lg font-bold text-foreground'>
          Thiếu địa chỉ email
        </h1>
        <p className='text-sm text-muted-foreground'>
          Hãy đăng nhập lại để hệ thống biết cần xác minh email nào.
        </p>
        <Button
          onClick={() => router.replace('/login')}
          className='rounded-xl font-semibold'
        >
          Về trang đăng nhập
        </Button>
      </div>
    );
  }

  return (
    <>
      <EmailVerificationForm
        email={email}
        onVerified={() => {
          // Verify chỉ trả JWT scope=email_verified, KHÔNG phải token phiên -
          // xác minh xong vẫn phải đăng nhập để lấy access token.
          toast.success('Xác minh email thành công! Mời bạn đăng nhập.');
          router.replace(`/login?email=${encodeURIComponent(email)}`);
        }}
      />

      <button
        type='button'
        onClick={() => router.replace('/login')}
        className='mt-6 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary'
      >
        <ArrowLeft className='size-4' /> Quay lại đăng nhập
      </button>
    </>
  );
}

export default function VerifyEmailPage() {
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
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
