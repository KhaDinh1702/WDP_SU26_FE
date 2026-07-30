'use client';

import { getErrorMessage } from '@/lib/getErrorMessage';
import { useRegister } from '@/hooks/auth/useRegister';
import { RegisterFormData } from '@/schemas/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { toLocalDateKey } from '@/lib/format';

export default function RegisterPage() {
  const route = useRouter();
  const register = useRegister();

  const handleSubmit = async (data: RegisterFormData): Promise<void> => {
    const { confirmPassword, dateOfBirth, ...rest } = data;
    if (confirmPassword !== data.password) {
      toast.error('Mật khẩu nhập lại không khớp.');
      return;
    }

    // `Register.dateOfBirth` là `format: date` → gửi `YYYY-MM-DD` theo giờ địa
    // phương, không phải ISO date-time đầy đủ.
    const payload = {
      ...rest,
      ...(dateOfBirth ? { dateOfBirth: toLocalDateKey(dateOfBirth) } : {}),
    };

    register.mutate(payload, {
      /**
       * BE trả `UserResponse` với `isActive: false` và KHÔNG có token nào
       * (khác mô tả trong Swagger), đồng thời chặn đăng nhập bằng 403 cho tới
       * khi email được xác minh. Nên đăng ký xong là đi thẳng sang bước nhập
       * OTP, không mở phiên và cũng không về thẳng trang đăng nhập.
       */
      onSuccess: () => {
        toast.success('Tạo tài khoản thành công! Còn một bước xác minh email.');
        route.replace(`/verify-email?email=${encodeURIComponent(payload.email)}`);
      },

      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  return (
    <div className='relative flex-1 overflow-hidden bg-[#f6f8fb]'>
      <div className='pointer-events-none absolute -top-32 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-sky-200/50 blur-[120px]' />
      <div className='pointer-events-none absolute -bottom-45 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-[120px]' />

      <div className='relative z-10 flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          <RegisterForm onSubmit={handleSubmit} loading={register.isPending} />
        </div>
      </div>
    </div>
  );
}
