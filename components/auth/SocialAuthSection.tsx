'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useGoogleRedirectLogin } from '@/hooks/auth/useGoogleLogin';

type SocialAuthSectionProps = {
  disabled?: boolean;
};

/**
 * Khối "Hoặc tiếp tục với" + nút đăng nhập Google.
 * Dùng chung cho cả LoginForm và RegisterForm.
 *
 * Dùng luồng redirect của BE: điều hướng cả trình duyệt sang GET /auth/google
 * (BE trả 302 sang màn hình đồng ý của Google), rồi Google quay về
 * /auth/google/callback kèm token trong fragment của URL. BE tự tạo tài khoản ở
 * lần đầu nên cùng một nút phục vụ cả đăng nhập lẫn đăng ký.
 */
export function SocialAuthSection({ disabled }: SocialAuthSectionProps) {
  const startGoogleLogin = useGoogleRedirectLogin();
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = () => {
    setRedirecting(true);
    startGoogleLogin();
  };

  return (
    <div>
      <div className='flex items-center gap-2'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-sm text-muted-foreground'>
          Hoặc tiếp tục với
        </span>
        <div className='h-px flex-1 bg-border' />
      </div>

      <Button
        variant='outline'
        type='button'
        disabled={disabled || redirecting}
        aria-busy={redirecting}
        onClick={handleClick}
        className='mt-5 h-12 w-full gap-3 rounded-xl border-primary/10 font-semibold'
      >
        {redirecting ? (
          <Spinner className='size-5' />
        ) : (
          <Image
            src='/logo-google.jpg'
            alt='Google'
            width={24}
            height={24}
            className='rounded-full'
          />
        )}
        {redirecting ? 'Đang chuyển tới Google...' : 'Đăng nhập với Google'}
      </Button>
    </div>
  );
}
