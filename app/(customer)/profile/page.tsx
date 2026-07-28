'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyProfile } from '@/lib/profile-api';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, KeyRound, LogIn, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { getInitials } from '@/lib/format';
import type { User } from '@/types/auth';

export default function ProfilePage() {
  const authUser = useAuthStore((state) => state.authUser);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  if (!hasHydrated) return <ProfilePageSkeleton />;

  if (!authUser) {
    return (
      <EmptyState
        icon={LogIn}
        title='Bạn cần đăng nhập để xem hồ sơ'
        description='Hồ sơ cá nhân chỉ hiển thị khi hệ thống xác định được phiên đăng nhập của bạn.'
        className='bg-card/80'
        action={
          <Button asChild className='font-bold'>
            <Link href='/login'>Đăng nhập</Link>
          </Button>
        }
      />
    );
  }

  return <ProfileContent authUser={authUser} />;
}

function ProfileContent({ authUser }: { authUser: User }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  // Nguồn dữ liệu chính là GET /me/profile; authUser chỉ là fallback khi
  // đang tải (auth/me chỉ trả payload token, không đủ trường hồ sơ).
  const { data: profileRes } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => getMyProfile(),
  });
  const profile = profileRes?.data ?? authUser;
  const initials = getInitials(profile.name);
  // Tài khoản tạo qua Google chưa có số điện thoại - BE yêu cầu bổ sung trước
  // lần đặt lịch đầu tiên.
  const missingPhone = !profile.phone;

  return (
    <div className='space-y-6'>
      <header>
        <span className='mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <UserRound className='size-5' />
        </span>
        <h1 className='font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
          Hồ sơ cá nhân
        </h1>
        <p className='mt-1 max-w-2xl text-sm leading-6 text-muted-foreground'>
          Cập nhật thông tin nhận diện và liên hệ đang dùng cho các lịch hẹn của
          bạn.
        </p>
      </header>

      {missingPhone && (
        <div className='flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground'>
          <AlertCircle className='size-4 shrink-0' />
          <span>
            Tài khoản chưa có số điện thoại. Vui lòng bổ sung trước khi đặt lịch
            rửa xe.
          </span>
        </div>
      )}

      <div className='grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]'>
        <Card className='gap-0 overflow-hidden rounded-2xl border-border/70 bg-card py-0 shadow-[0_18px_45px_-36px_rgba(30,58,138,0.6)]'>
          <div className='h-20 bg-primary/8 [background-image:radial-gradient(circle_at_1px_1px,rgba(37,78,180,0.18)_1px,transparent_0)] [background-size:16px_16px]' />
          <CardContent className='-mt-11 flex flex-col items-center px-6 pb-7 text-center'>
            <div className='flex size-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-primary/10 text-2xl font-bold text-primary shadow-sm'>
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={`Ảnh đại diện của ${profile.name}`}
                  className='size-full object-cover'
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <h2 className='mt-4 font-heading text-xl font-bold capitalize text-foreground'>
              {profile.name}
            </h2>
            <p className='mt-1 max-w-full truncate text-sm text-muted-foreground'>
              {profile.email}
            </p>
          </CardContent>
        </Card>

        <Card className='gap-0 rounded-2xl border-border/70 bg-card py-0 shadow-[0_18px_45px_-36px_rgba(30,58,138,0.6)]'>
          <CardContent className='p-5 sm:p-7'>
            <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h2 className='font-heading text-lg font-bold text-foreground'>
                  Thông tin tài khoản
                </h2>
                <p className='text-sm text-muted-foreground'>
                  Chỉnh sửa và bấm Lưu để cập nhật hồ sơ của bạn.
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPasswordOpen(true)}
              >
                <KeyRound className='size-4' />
                Đổi mật khẩu
              </Button>
            </div>
            <ProfileEditForm profile={profile} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại để xác nhận, sau đó đặt mật khẩu mới.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onDone={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='space-y-3'>
        <Skeleton className='size-11 rounded-xl' />
        <Skeleton className='h-8 w-56' />
        <Skeleton className='h-4 w-full max-w-md' />
      </div>
      <div className='grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]'>
        <Skeleton className='h-72 rounded-2xl' />
        <Skeleton className='h-80 rounded-2xl' />
      </div>
    </div>
  );
}
