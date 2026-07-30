import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { claimCampaignVoucher } from '@/lib/customer-api';
import type { Voucher } from '@/types/voucher';

/**
 * Đổi lỗi của `POST /voucher-campaigns/:id/claim` thành câu tiếng Việt.
 *
 * Khác với `/me/vouchers/claim` (gộp mọi từ chối thành 404 để không lộ mã bí
 * mật nào tồn tại), route này nói rõ lý do vì id chiến dịch vốn công khai - nên
 * FE hiển thị đúng nguyên nhân thay vì một câu chung chung.
 */
export function getClaimErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Không nhận được ưu đãi. Vui lòng thử lại.';
  }
  if (!error.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }

  const raw = error.response.data?.message;
  const serverMessage = Array.isArray(raw) ? raw[0] : raw;

  switch (error.response.status) {
    case 401:
      return 'Bạn cần đăng nhập để nhận ưu đãi.';
    case 403:
      return 'Hạng thành viên của bạn chưa đủ điều kiện nhận ưu đãi này.';
    case 404:
      return 'Chương trình không tồn tại hoặc chưa được công bố.';
    case 409:
      // BE nói rõ lý do trong `message`: hết ngân sách, hết lượt của khách,
      // hết voucher trong kho, hoặc chiến dịch không còn chạy.
      return (
        serverMessage ?? 'Ưu đãi này hiện không nhận được. Vui lòng thử lại sau.'
      );
    case 429:
      return 'Bạn thao tác hơi nhanh. Vui lòng chờ ít phút rồi thử lại.';
    default:
      return 'Không nhận được ưu đãi. Vui lòng thử lại.';
  }
}

/**
 * Nhận một voucher từ pool của chiến dịch — POST /voucher-campaigns/:id/claim.
 *
 * Không gửi mã: bản công khai của chiến dịch cố tình không lộ `publicClaimCode`,
 * nên server tự rút một voucher chưa ai nhận và gán cho khách đang đăng nhập.
 * Thành công thì làm mới ví voucher và danh sách chiến dịch để `remaining` /
 * `alreadyClaimed` cập nhật ngay.
 */
export const useClaimCampaign = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string): Promise<Voucher> => {
      const res = await claimCampaignVoucher(campaignId);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-vouchers'] });
      qc.invalidateQueries({ queryKey: ['voucher-campaigns'] });
      qc.invalidateQueries({ queryKey: ['voucher-campaign'] });
    },
  });
};
