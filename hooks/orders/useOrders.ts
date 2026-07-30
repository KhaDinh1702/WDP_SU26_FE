import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyOrders,
  getMyOrder,
  getMyOrderWorkOrder,
  createOrder,
  rescheduleOrder,
  cancelOrder,
  getAvailableSlots,
  getActiveServiceTypes,
  getMyLoyalty,
  previewOrder,
} from '@/lib/customer-api';
import {
  CreateOrderDto,
  RescheduleOrderDto,
  CancelOrderDto,
  PreviewOrderResponse,
} from '@/types/order';
import type { LoyaltyAccount } from '@/types/loyalty';

export const useMyOrders = () => {
  return useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await getMyOrders();
      return res.data?.data || res.data || [];
    },
  });
};

export const useMyOrderDetail = (id: string) => {
  return useQuery({
    queryKey: ['my-order', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await getMyOrder(id);
      return res.data;
    },
    enabled: !!id,
  });
};

/** Ảnh hiện trạng xe của một đơn: trước khi rửa (check-in) và sau khi rửa (check-out). */
export interface OrderWashPhotos {
  checkinPhotos: string[];
  checkoutPhotos: string[];
}

/**
 * Ảnh trước/sau khi rửa của một đơn, lấy từ work order của chính đơn đó.
 * Đơn chưa được tạo work order (chưa check-in) sẽ trả 404 → coi như chưa có ảnh.
 */
export const useMyOrderWashPhotos = (
  orderId: string | null | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['my-order-wash-photos', orderId],
    queryFn: async (): Promise<OrderWashPhotos> => {
      if (!orderId) return { checkinPhotos: [], checkoutPhotos: [] };
      const res = await getMyOrderWorkOrder(orderId);
      const wo = res.data?.data ?? res.data ?? {};
      return {
        checkinPhotos: Array.isArray(wo.checkinPhotos) ? wo.checkinPhotos : [],
        checkoutPhotos: Array.isArray(wo.checkoutPhotos)
          ? wo.checkoutPhotos
          : [],
      };
    },
    enabled: enabled && !!orderId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderDto) => {
      const res = await createOrder(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
};

export const useRescheduleOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: RescheduleOrderDto;
    }) => {
      const res = await rescheduleOrder(id, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-order', variables.id] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CancelOrderDto }) => {
      const res = await cancelOrder(id, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-order', variables.id] });
    },
  });
};

export const useAvailableSlots = (params: {
  serviceTypeId: string;
  vehicleTypeId: string;
  from: string;
  to: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: [
      'available-slots',
      params.serviceTypeId,
      params.vehicleTypeId,
      params.from,
      params.to,
    ],
    queryFn: async () => {
      if (
        !params.serviceTypeId ||
        !params.vehicleTypeId ||
        !params.from ||
        !params.to
      )
        return [];
      const res = await getAvailableSlots({
        serviceTypeId: params.serviceTypeId,
        vehicleTypeId: params.vehicleTypeId,
        from: params.from,
        to: params.to,
      });
      return res.data || [];
    },
    enabled:
      params.enabled !== false &&
      !!params.serviceTypeId &&
      !!params.vehicleTypeId &&
      !!params.from &&
      !!params.to,
  });
};

export const useActiveServiceTypes = () => {
  return useQuery({
    queryKey: ['active-service-types'],
    queryFn: async () => {
      const res = await getActiveServiceTypes();
      return res.data || [];
    },
  });
};

/**
 * Tài khoản loyalty của khách - `LoyaltyAccountResponse`.
 * Mốc nhận voucher (`washesRequiredForNextVoucher`) và giá trị voucher kế tiếp
 * (`estimatedNextVoucherVnd`) do BE tính theo hạng, KHÔNG suy lại ở client.
 */
export type MyLoyalty = LoyaltyAccount;

/**
 * MỌI chỗ hiển thị hạng/điểm phải dùng hook này, đừng tự khai `useQuery` với
 * key `['my-loyalty']`: hai queryFn khác nhau trên cùng một key sẽ ghi đè cache
 * của nhau bằng hai kiểu dữ liệu khác nhau, và màn hình nào đọc sau sẽ nhận
 * `undefined` (đó là lý do badge hạng ở Navbar tụt về giá trị lúc đăng nhập).
 *
 * `refetchOnMount: 'always'` vì điểm và hạng đổi sau mỗi lần rửa xong mà không
 * có event realtime nào invalidate key này — mở lại trang là có số mới, khỏi F5.
 */
export const useMyLoyalty = (enabled = true) => {
  return useQuery({
    queryKey: ['my-loyalty'],
    queryFn: async (): Promise<MyLoyalty | null> => {
      const res = await getMyLoyalty();
      return res.data?.data ?? res.data ?? null;
    },
    // Navbar hiển thị cả với khách chưa đăng nhập — chỗ đó truyền `!!authUser`
    // để không gọi API bằng phiên rỗng.
    enabled,
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

/**
 * Xem trước giá đơn (giảm theo hạng + golden hour + voucher) trước khi đặt.
 * Không tiêu voucher. Tự chạy lại khi đổi service/giờ/voucher.
 */
export const usePreviewOrder = (params: {
  serviceTypeId: string;
  vehicleTypeId: string;
  scheduledAt: string;
  voucherId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: [
      'order-preview',
      params.serviceTypeId,
      params.vehicleTypeId,
      params.scheduledAt,
      params.voucherId ?? null,
    ],
    queryFn: async (): Promise<PreviewOrderResponse | null> => {
      if (!params.serviceTypeId || !params.vehicleTypeId || !params.scheduledAt)
        return null;
      const res = await previewOrder({
        serviceTypeId: params.serviceTypeId,
        vehicleTypeId: params.vehicleTypeId,
        scheduledAt: params.scheduledAt,
        voucherId: params.voucherId,
      });
      return res.data?.data ?? res.data ?? null;
    },
    enabled:
      params.enabled !== false &&
      !!params.serviceTypeId &&
      !!params.vehicleTypeId &&
      !!params.scheduledAt,
  });
};
