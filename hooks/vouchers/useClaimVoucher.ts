import { useMutation, useQueryClient } from '@tanstack/react-query';
import { claimVoucher } from '@/lib/customer-api';
import { Voucher } from '@/types/voucher';

/**
 * Khách nhập mã để nhận 1 voucher pool. Thành công thì làm mới danh sách
 * voucher của khách để voucher vừa nhận hiện ra ngay.
 */
export const useClaimVoucher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<Voucher> => {
      const res = await claimVoucher(code);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-vouchers'] });
    },
  });
};
