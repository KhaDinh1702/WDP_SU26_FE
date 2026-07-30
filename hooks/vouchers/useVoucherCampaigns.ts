import { useQuery } from '@tanstack/react-query';
import { getVoucherCampaign, getVoucherCampaigns } from '@/lib/customer-api';
import type {
  PaginationMeta,
  VoucherCampaignPublic,
  VoucherCampaignPublicQuery,
} from '@/types/voucher';

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: 0,
  total: 0,
  totalPages: 1,
};

/**
 * GET /voucher-campaigns — chương trình ưu đãi khách được xem.
 *
 * BE phân trang sẵn nên hook trả về cả `meta`; `status` bỏ trống thì BE mặc
 * định `active`, nhưng vẫn đưa vào query key để đổi tab là đổi cache.
 */
export const useVoucherCampaigns = (params: VoucherCampaignPublicQuery = {}) => {
  const { status, page = 1, limit = 12 } = params;
  return useQuery({
    queryKey: ['voucher-campaigns', status ?? 'active', page, limit],
    queryFn: async (): Promise<{
      data: VoucherCampaignPublic[];
      meta: PaginationMeta;
    }> => {
      const res = await getVoucherCampaigns({ status, page, limit });
      // BE trả `{ data, meta }`. Giữ nhánh mảng trần để không vỡ nếu một
      // deployment cũ hơn còn trả thẳng danh sách.
      const body = res.data;
      if (Array.isArray(body)) {
        return {
          data: body,
          meta: { ...EMPTY_META, limit, total: body.length },
        };
      }
      return {
        data: body?.data ?? [],
        meta: body?.meta ?? { ...EMPTY_META, page, limit },
      };
    },
  });
};

/**
 * GET /voucher-campaigns/:id — chi tiết một chương trình.
 * Chiến dịch `draft` trả 404, đúng như bản công khai quy định.
 */
export const useVoucherCampaign = (id: string) => {
  return useQuery({
    queryKey: ['voucher-campaign', id],
    queryFn: async (): Promise<VoucherCampaignPublic | null> => {
      if (!id) return null;
      const res = await getVoucherCampaign(id);
      return res.data ?? null;
    },
    enabled: !!id,
    retry: false,
  });
};
