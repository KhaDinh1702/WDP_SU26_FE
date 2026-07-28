'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Camera, AlertCircle, LogIn, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getInitials } from '@/lib/format';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
  useChangeMyPassword,
  useMyProfile,
  useUpdateMyProfile,
} from '@/hooks/profile/useProfile';
import type { UpdateProfileDto, User } from '@/types/auth';

type ProfileFormData = {
  name: string;
  email: string;
  phone: string;
  day: string;
  month: string;
  year: string;
};

function getProfileFormData(user: User): ProfileFormData {
  const dob = user.dateOfBirth ? new Date(user.dateOfBirth) : null;

  return {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    day: dob ? dob.getDate().toString() : '',
    month: dob ? (dob.getMonth() + 1).toString() : '',
    year: dob ? dob.getFullYear().toString() : '',
  };
}

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => 2024 - i);

const PHONE_PATTERN = /^(03|05|07|08|09)\d{8}$/;

export default function ProfilePage() {
  const authUser = useAuthStore((s) => s.authUser);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  // GET /me/profile là nguồn chuẩn; store chỉ là bản đệm để render ngay.
  const { data: profile } = useMyProfile();

  if (!_hasHydrated) {
    return <ProfilePageSkeleton />;
  }

  const user = profile ?? authUser;

  if (!user) {
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

  return <ProfileContent key={user.id ?? user.email} user={user} />;
}

function ProfileContent({ user }: { user: User }) {
  const [formData, setFormData] = useState(() => getProfileFormData(user));
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [syncedUser, setSyncedUser] = useState(user);

  const updateProfile = useUpdateMyProfile();

  // Nạp lại form khi GET /me/profile trả về hồ sơ mới hơn bản đệm trong store.
  // Điều chỉnh state ngay trong lúc render (không dùng effect) để tránh một
  // vòng render thừa hiển thị dữ liệu cũ.
  if (syncedUser !== user) {
    setSyncedUser(user);
    setFormData(getProfileFormData(user));
  }

  const initials = getInitials(user.name);
  // Tài khoản tạo qua Google chưa có số điện thoại - cần bổ sung trước lần đặt
  // lịch đầu tiên.
  const missingPhone = !user.phone;

  const handleSave = () => {
    const name = formData.name.trim();
    if (name.length < 2) {
      toast.error('Họ tên cần ít nhất 2 ký tự.');
      return;
    }

    const phone = formData.phone.trim();
    if (phone && !PHONE_PATTERN.test(phone)) {
      toast.error('Số điện thoại không đúng định dạng.');
      return;
    }

    const payload: UpdateProfileDto = { name };
    if (phone && phone !== user.phone) payload.phone = phone;

    // `UpdateUser.dateOfBirth` là `format: date` → gửi `YYYY-MM-DD`.
    const { day, month, year } = formData;
    if (day && month && year) {
      payload.dateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success('Đã cập nhật hồ sơ.'),
      // 409 = số điện thoại đã có tài khoản khác dùng.
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className='space-y-4'>
      {missingPhone && (
        <div className='flex items-center gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning'>
          <AlertCircle className='size-4 shrink-0' />
          <span>
            Tài khoản chưa có số điện thoại. Vui lòng bổ sung trước khi đặt lịch
            rửa xe.
          </span>
        </div>
      )}

      <Card className='overflow-hidden rounded-xl border-none bg-card/80 shadow-md backdrop-blur-md'>
        <CardContent className='p-8'>
          <div className='mb-8 border-b border-border pb-4'>
            <h1 className='font-heading text-xl font-bold text-foreground'>
              Hồ Sơ Của Tôi
            </h1>
            <p className='text-sm text-muted-foreground'>
              Quản lý thông tin hồ sơ để bảo mật tài khoản
            </p>
          </div>

          <div className='grid grid-cols-1 gap-12 lg:grid-cols-12'>
            <div className='space-y-6 lg:col-span-8'>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4'>
                <Label className='font-medium text-muted-foreground sm:text-right'>
                  Tên
                </Label>
                <div className='sm:col-span-2'>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={updateProfile.isPending}
                    className='h-10 rounded-xl'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4'>
                <Label className='font-medium text-muted-foreground sm:text-right'>
                  Email
                </Label>
                {/* Email không sửa được qua PATCH /me/profile. */}
                <div className='flex items-center gap-2 sm:col-span-2'>
                  <span className='text-foreground'>{formData.email}</span>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4'>
                <Label className='font-medium text-muted-foreground sm:text-right'>
                  Số điện thoại
                </Label>
                <div className='sm:col-span-2'>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={updateProfile.isPending}
                    placeholder='VD: 0901234567'
                    inputMode='numeric'
                    className='h-10 rounded-xl'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4'>
                <Label className='font-medium text-muted-foreground sm:text-right'>
                  Ngày sinh
                </Label>
                <div className='grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-3'>
                  <Select
                    value={formData.day}
                    onValueChange={(day) => setFormData({ ...formData, day })}
                  >
                    <SelectTrigger className='h-10 rounded-xl'>
                      <SelectValue placeholder='Ngày' />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.month}
                    onValueChange={(month) =>
                      setFormData({ ...formData, month })
                    }
                  >
                    <SelectTrigger className='h-10 rounded-xl'>
                      <SelectValue placeholder='Tháng' />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.year}
                    onValueChange={(year) => setFormData({ ...formData, year })}
                  >
                    <SelectTrigger className='h-10 rounded-xl'>
                      <SelectValue placeholder='Năm' />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3 sm:items-center sm:gap-4'>
                <div />
                <div className='flex flex-wrap items-center gap-3 sm:col-span-2'>
                  <Button
                    type='button'
                    size='lg'
                    disabled={updateProfile.isPending}
                    aria-busy={updateProfile.isPending}
                    onClick={handleSave}
                    className='rounded-xl px-10 font-bold shadow-md shadow-primary/20'
                  >
                    {updateProfile.isPending && <Spinner />}
                    {updateProfile.isPending ? 'Đang lưu...' : 'Lưu'}
                  </Button>

                  <Button
                    type='button'
                    size='lg'
                    variant='outline'
                    onClick={() => setShowPasswordForm((prev) => !prev)}
                    className='rounded-xl font-semibold'
                  >
                    <KeyRound className='size-4' /> Đổi mật khẩu
                  </Button>
                </div>
              </div>

              {showPasswordForm && (
                <ChangePasswordForm onDone={() => setShowPasswordForm(false)} />
              )}
            </div>

            <div className='flex flex-col items-center justify-start space-y-4 border-t border-border pt-8 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-4'>
              <div className='group relative'>
                <div className='flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-md transition-all group-hover:opacity-90'>
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt='Ảnh đại diện'
                      className='size-full object-cover'
                    />
                  ) : (
                    <span className='text-3xl font-black text-muted-foreground/40'>
                      {initials}
                    </span>
                  )}
                  <div className='absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                    <Camera className='size-8 text-white' />
                  </div>
                </div>
              </div>

              <Button variant='outline' className='rounded-xl font-semibold'>
                Chọn Ảnh
              </Button>

              <div className='space-y-1 text-center'>
                <p className='text-xs text-muted-foreground'>
                  Dung lượng file tối đa 1 MB
                </p>
                <p className='text-xs text-muted-foreground'>
                  Định dạng: .JPEG, .PNG
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** POST /me/profile/change-password - cần đúng mật khẩu hiện tại. */
function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const changePassword = useChangeMyPassword();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = () => {
    if (newPassword.length < 8 || newPassword.length > 72) {
      toast.error('Mật khẩu mới cần từ 8 đến 72 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp.');
      return;
    }

    changePassword.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Đã đổi mật khẩu.');
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          onDone();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <div className='space-y-4 rounded-xl border border-border bg-muted/30 p-5'>
      <h2 className='font-heading text-sm font-bold text-foreground'>
        Đổi mật khẩu
      </h2>

      <div className='grid gap-3 sm:grid-cols-3'>
        <Input
          type='password'
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          placeholder='Mật khẩu hiện tại'
          autoComplete='current-password'
          disabled={changePassword.isPending}
          className='h-10 rounded-xl'
        />
        <Input
          type='password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder='Mật khẩu mới'
          autoComplete='new-password'
          disabled={changePassword.isPending}
          className='h-10 rounded-xl'
        />
        <Input
          type='password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder='Nhập lại mật khẩu mới'
          autoComplete='new-password'
          disabled={changePassword.isPending}
          className='h-10 rounded-xl'
        />
      </div>

      <div className='flex items-center gap-3'>
        <Button
          type='button'
          onClick={submit}
          disabled={changePassword.isPending}
          aria-busy={changePassword.isPending}
          className='rounded-xl font-semibold'
        >
          {changePassword.isPending && <Spinner />}
          {changePassword.isPending ? 'Đang đổi...' : 'Xác nhận'}
        </Button>
        <Button
          type='button'
          variant='ghost'
          onClick={onDone}
          className='rounded-xl font-semibold'
        >
          Huỷ
        </Button>
      </div>

      <p className='text-xs text-muted-foreground'>
        Tài khoản đăng nhập bằng Google chưa có mật khẩu — hãy dùng &quot;Quên
        mật khẩu&quot; ở trang đăng nhập để đặt mật khẩu lần đầu.
      </p>
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className='space-y-4'>
      <Skeleton className='h-14 w-full rounded-md' />
      <Card className='border-none bg-card/80 shadow-md'>
        <CardContent className='p-8'>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='mt-3 h-4 w-72' />
          <div className='mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12'>
            <div className='space-y-6 lg:col-span-8'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className='grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4'
                >
                  <Skeleton className='h-4 w-28 sm:justify-self-end' />
                  <Skeleton className='h-10 w-full sm:col-span-2' />
                </div>
              ))}
            </div>
            <div className='flex flex-col items-center gap-4 lg:col-span-4'>
              <Skeleton className='h-32 w-32 rounded-full' />
              <Skeleton className='h-10 w-28' />
              <Skeleton className='h-4 w-40' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
