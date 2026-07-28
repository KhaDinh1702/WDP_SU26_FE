import { useQuery } from '@tanstack/react-query';
import { getMyVouchers } from '@/lib/customer-api';
import { Voucher, VoucherStatus } from '@/types/voucher';

/**
 * GET /me/vouchers — trả về MẢNG voucher (không phân trang), mỗi voucher đã
 * nhúng sẵn `campaign` nên ví voucher render được chỉ với một request.
 */
export const useVouchers = (status?: VoucherStatus) => {
  return useQuery({
    queryKey: ['my-vouchers', status ?? 'all'],
    queryFn: async (): Promise<Voucher[]> => {
      const res = await getMyVouchers(status);
      return Array.isArray(res.data) ? res.data : [];
    },
  });
};
