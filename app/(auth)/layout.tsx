'use client';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthNavbar } from '@/components/auth/AuthNavbar';
import { Footer } from '@/components/home/Footer';
import { Skeleton } from '@/components/ui/skeleton';

interface LayoutProps {
  children: React.ReactNode;
}
export default function AuthLayout({ children }: LayoutProps) {
  const { accessToken, _hasHydrated, authUser } = useAuthStore();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;

    if (accessToken && authUser) {
      if (authUser.role === 'admin') {
        router.replace('/admin');
      } else if (authUser.role === 'cashier') {
        router.replace('/cashier');
      } else if (authUser.role === 'washer') {
        router.replace('/washer');
      } else if (authUser.role === 'manager') {
        router.replace('/manager');
      } else {
        router.replace('/');
      }
    } else if (accessToken && !authUser) {
      // Phiên hỏng (có token nhưng mất user): xoá sạch cả refreshToken, nếu
      // để sót thì lần đăng xuất sau sẽ gửi token cũ đã vô hiệu.
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, [
    _hasHydrated,
    accessToken,
    authUser,
    router,
    setAccessToken,
    setRefreshToken,
    setUser,
  ]);

  if (!_hasHydrated) {
    return (
      <main className='min-h-screen bg-background px-4 py-24'>
        <div className='mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center'>
          <div className='hidden space-y-5 lg:block'>
            <Skeleton className='h-24 w-24 rounded-full' />
            <Skeleton className='h-12 w-56' />
            <Skeleton className='h-5 w-80' />
            <Skeleton className='h-5 w-64' />
          </div>
          <div className='rounded-2xl border border-border bg-card p-8 shadow-sm'>
            <Skeleton className='mx-auto h-8 w-56' />
            <Skeleton className='mx-auto mt-3 h-4 w-44' />
            <div className='mt-8 space-y-5'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (accessToken && authUser) return null;

  return (
    <div className='flex flex-col min-h-screen bg-background'>
      <AuthNavbar />
      <main className='flex-1 flex flex-col mt-16'>
        {children}
      </main>
      <Footer />
    </div>
  );
}
