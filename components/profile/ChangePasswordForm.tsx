'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { changeMyPassword } from '@/lib/profile-api';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/** Form đổi mật khẩu: cần mật khẩu hiện tại + mật khẩu mới (≥8 ký tự). */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: changeMyPassword,
    onSuccess: () => {
      toast.success('Đã đổi mật khẩu');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onDone?.();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp');
      return;
    }
    mutation.mutate({ oldPassword, newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-1.5'>
        <Label htmlFor='pw-old'>Mật khẩu hiện tại</Label>
        <Input
          id='pw-old'
          type='password'
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoComplete='current-password'
          required
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='pw-new'>Mật khẩu mới</Label>
        <Input
          id='pw-new'
          type='password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete='new-password'
          minLength={8}
          maxLength={72}
          required
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='pw-confirm'>Nhập lại mật khẩu mới</Label>
        <Input
          id='pw-confirm'
          type='password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete='new-password'
          minLength={8}
          maxLength={72}
          required
        />
      </div>
      <div className='flex justify-end'>
        <Button type='submit' disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className='size-4 animate-spin' />}
          Đổi mật khẩu
        </Button>
      </div>
    </form>
  );
}
