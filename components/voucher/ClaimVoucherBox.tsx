'use client';

import { useState, type Ref } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { useClaimVoucher } from '@/hooks/vouchers/useClaimVoucher';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { cn } from '@/lib/utils';

type ClaimVoucherBoxProps = {
  /** Nhãn trên ô nhập. Đổi được để trang ưu đãi nói rõ mã của chương trình. */
  label?: string;
  /** Ghi chú nhỏ dưới ô nhập, ví dụ nơi khách lấy mã. */
  hint?: string;
  /**
   * Cho trang ngoài giành lấy focus (thẻ ưu đãi bấm "Nhập mã để nhận").
   * `id` phải khác nhau nếu một trang render hai ô.
   */
  inputRef?: Ref<HTMLInputElement>;
  id?: string;
  className?: string;
};

/**
 * Ô nhập mã để nhận voucher — POST /me/vouchers/claim.
 *
 * Mã có thể là mã riêng của một voucher trong lô, hoặc mã chung của một chiến
 * dịch (`public_claim_code`) — BE nhận cả hai và tự rút một voucher khỏi kho.
 * BE trả cùng một thông báo 404 cho mọi trường hợp sai/đã nhận/hết hạn, nên ở
 * đây chỉ hiển thị nguyên văn thông báo đó, không suy diễn thêm.
 */
export function ClaimVoucherBox({
  label = 'Có mã voucher? Nhập để nhận vào tài khoản',
  hint,
  inputRef,
  id = 'claim-code',
  className,
}: ClaimVoucherBoxProps) {
  const [code, setCode] = useState('');
  const claim = useClaimVoucher();

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    claim.mutate(trimmed, {
      onSuccess: (v) => {
        toast.success(
          `Đã nhận voucher ${v.code}! Xem trong mục "Chưa sử dụng".`,
        );
        setCode('');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:p-5',
        className,
      )}
    >
      <label htmlFor={id} className='text-xs font-medium text-muted-foreground'>
        {label}
      </label>
      <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
        <input
          id={id}
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder='VD: TET2026-4KP9XM2A7B'
          className='min-w-0 flex-1 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        />
        <button
          type='button'
          onClick={submit}
          disabled={claim.isPending || code.trim() === ''}
          className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        >
          {claim.isPending ? (
            <Spinner className='size-4' />
          ) : (
            <Plus className='w-4 h-4' />
          )}
          Nhận
        </button>
      </div>
      {hint && (
        <p className='mt-2 text-[11px] text-muted-foreground'>{hint}</p>
      )}
    </div>
  );
}
