'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { getInitials } from '@/lib/format';
import { updateMyProfile } from '@/lib/profile-api';
import { uploadImage } from '@/lib/upload-api';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

/** Chuyển giá trị ngày từ API (Date/ISO) về dạng yyyy-MM-dd cho input[type=date]. */
function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Form tự sửa hồ sơ (tên, SĐT, ngày sinh, avatar). Email chỉ đọc vì là định
 * danh đăng nhập. Sau khi lưu, đồng bộ lại authUser trong store để navbar/
 * sidebar đổi tên ngay lập tức.
 */
export function ProfileEditForm({
  profile,
  onSaved,
}: {
  profile: User;
  onSaved?: (user: User) => void;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(
    toDateInputValue(profile.dateOfBirth),
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (res) => {
      const updated = res.data;
      const { authUser, setUser } = useAuthStore.getState();
      setUser(authUser ? { ...authUser, ...updated } : updated);
      void qc.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Đã cập nhật hồ sơ');
      onSaved?.(updated);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handlePickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await uploadImage(file);
      setAvatarUrl(res.data.url);
      toast.success('Đã tải ảnh lên — bấm Lưu để áp dụng');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Tên không được để trống');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      avatarUrl: avatarUrl || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      {/* Avatar */}
      <div className='flex items-center gap-4'>
        <div className='relative'>
          <div className='flex size-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-bold text-primary'>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt='Ảnh đại diện'
                className='size-full object-cover'
              />
            ) : (
              <span>{getInitials(name)}</span>
            )}
          </div>
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className='absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60'
            aria-label='Đổi ảnh đại diện'
          >
            {isUploading ? (
              <Loader2 className='size-3.5 animate-spin' />
            ) : (
              <Camera className='size-3.5' />
            )}
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={(e) => void handlePickAvatar(e.target.files?.[0])}
          />
        </div>
        <div className='text-sm text-muted-foreground'>
          Ảnh đại diện (JPG/PNG). Bấm biểu tượng máy ảnh để đổi.
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='profile-name'>Họ và tên</Label>
          <Input
            id='profile-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='profile-phone'>Số điện thoại</Label>
          <Input
            id='profile-phone'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode='tel'
            pattern='[0-9+\-\s]{8,20}'
            title='8-20 ký tự: số, dấu +, -, khoảng trắng'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='profile-dob'>Ngày sinh</Label>
          <Input
            id='profile-dob'
            type='date'
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='profile-email'>Email (không thể đổi)</Label>
          <Input id='profile-email' value={profile.email} disabled readOnly />
        </div>
      </div>

      <div className='flex justify-end'>
        <Button type='submit' disabled={mutation.isPending || isUploading}>
          {mutation.isPending && <Loader2 className='size-4 animate-spin' />}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}
