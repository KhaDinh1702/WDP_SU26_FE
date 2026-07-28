import { useQuery } from '@tanstack/react-query';
import { getMyVoucher } from '@/lib/customer-api';
import { Voucher } from '@/types/voucher';

export const useVoucher = (id: string) => {
  return useQuery<Voucher | null>({
    queryKey: ['my-voucher', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await getMyVoucher(id);
      return res.data ?? null;
    },
    enabled: !!id,
  });
};
