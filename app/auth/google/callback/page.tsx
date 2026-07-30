'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/useAuthStore';
import { getRoleHome } from '@/constants';

/**
 * Điểm hạ cánh của luồng redirect Google (GET /auth/google → Google → BE
 * /auth/google/callback → trang này).
 *
 * BE trả token trong FRAGMENT của URL chứ không phải query string, để token
 * không đi qua server của frontend và không lọt vào access log hay header
 * Referer. Vì vậy phải đọc bằng `window.location.hash` ở phía client — server
 * component không bao giờ nhìn thấy phần này.
 *
 *   Thành công: `#accessToken=...&refreshToken=...`
 *   Thất bại:   `#error=<message>`
 */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const getUser = useAuthStore((s) => s.getUser);
  const [error, setError] = useState<string | null>(null);
  // React 19 StrictMode gọi effect hai lần ở dev; chỉ xử lý fragment một lần.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const googleError = params.get('error');
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    // Fragment chỉ tồn tại phía trình duyệt và không bao giờ tới server, nên
    // không có nguồn nào đọc được nó lúc render - buộc phải set state tại đây.
    if (googleError || !accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(googleError || 'Không nhận được phiên đăng nhập từ Google.');
      return;
    }

    // Xoá token khỏi thanh địa chỉ ngay khi đã đọc xong.
    window.history.replaceState(null, '', window.location.pathname);

    setSession({ accessToken, refreshToken });

    // Callback chỉ trả token, không kèm hồ sơ → lấy qua GET /me/profile.
    getUser()
      .then((user) => {
        toast.success('Đăng nhập Google thành công!');
        router.replace(getRoleHome(user?.role));
      })
      .catch(() => {
        setError('Không tải được hồ sơ tài khoản. Vui lòng đăng nhập lại.');
      });
  }, [getUser, router, setSession]);

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4'>
        <div className='w-full max-w-md space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center'>
          <AlertCircle className='mx-auto size-8 text-destructive' />
          <h1 className='font-heading text-lg font-bold text-destructive'>
            Đăng nhập Google không thành công
          </h1>
          <p className='text-sm text-destructive/90'>{error}</p>
          <Button
            onClick={() => router.replace('/login')}
            className='rounded-xl font-semibold'
          >
            Quay lại đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f8fb]'>
      <Spinner className='size-8 text-primary' />
      <p className='text-sm font-semibold text-muted-foreground'>
        Đang hoàn tất đăng nhập Google...
      </p>
    </div>
  );
}
