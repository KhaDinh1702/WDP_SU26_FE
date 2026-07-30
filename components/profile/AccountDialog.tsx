'use client';

import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMyProfile } from '@/lib/profile-api';
import { useQuery } from '@tanstack/react-query';

/**
 * Dialog "Tài khoản của tôi" cho các role staff (admin/manager/cashier/washer)
 * — nhóm này không vào được /profile (route group customer) nên sửa hồ sơ và
 * đổi mật khẩu ngay tại sidebar.
 */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => getMyProfile(),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Tài khoản của tôi</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cá nhân hoặc đổi mật khẩu đăng nhập.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue='info'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='info'>Thông tin</TabsTrigger>
            <TabsTrigger value='password'>Mật khẩu</TabsTrigger>
          </TabsList>
          <TabsContent value='info' className='pt-4'>
            {isLoading || !data ? (
              <div className='space-y-3'>
                <Skeleton className='h-16 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : (
              <ProfileEditForm profile={data.data} />
            )}
          </TabsContent>
          <TabsContent value='password' className='pt-4'>
            <ChangePasswordForm onDone={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
