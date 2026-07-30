'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CreditCard,
  ChevronRight,
  Search,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMyOrders, useActiveServiceTypes } from '@/hooks/orders/useOrders';
import { getMyVehicles } from '@/lib/customer-api';
import {
  RescheduleOrderModal,
  CancelOrderModal,
  FeedbackOrderModal,
  OrderPhotoLightbox,
  CustomerVehicle,
} from '@/components/orders/OrderModals';
import { OrderWashPhotos } from '@/components/orders/OrderWashPhotos';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatLicensePlate,
  capitalizeWords,
} from '@/lib/format';
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  isCancellableByCustomer,
  isSettledPayment,
} from '@/constants';
import { Order, OrderStatus } from '@/types/order';

interface ServiceTypeOption {
  _id?: string;
  id?: string;
  name?: string;
}

/**
 * Tab = nhóm trạng thái lớn (Sắp tới / Đang thực hiện / ...) thay vì 1 tab
 * mỗi trạng thái BE. Trạng thái nghiệp vụ chi tiết vẫn nằm trên badge từng đơn.
 */
const TAB_GROUPS: { id: string; label: string; statuses: OrderStatus[] }[] = [
  {
    id: 'all',
    label: 'Tất cả',
    statuses: [
      'pending_payment',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
  },
  { id: 'pending', label: 'Chờ thanh toán', statuses: ['pending_payment'] },
  { id: 'upcoming', label: 'Sắp tới', statuses: ['confirmed'] },
  {
    id: 'processing',
    label: 'Đang thực hiện',
    statuses: ['checked_in', 'in_progress'],
  },
  { id: 'completed', label: 'Hoàn thành', statuses: ['completed'] },
  { id: 'cancelled', label: 'Đã hủy', statuses: ['cancelled', 'no_show'] },
];

const SORT_OPTIONS = [
  { id: 'soonest', label: 'Ngày giờ sớm nhất' },
  { id: 'priority', label: 'Ưu tiên xử lý' },
  { id: 'newest', label: 'Mới tạo gần đây' },
  { id: 'oldest', label: 'Cũ nhất' },
  { id: 'price-desc', label: 'Giá cao → thấp' },
  { id: 'price-asc', label: 'Giá thấp → cao' },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]['id'];

/** Rank nhóm cho sort "Ưu tiên xử lý": cần hành động → sắp diễn ra → lịch sử. */
function priorityRank(status: OrderStatus): number {
  if (status === 'pending_payment') return 0;
  if (status === 'confirmed' || status === 'checked_in' || status === 'in_progress')
    return 1;
  return 2;
}

export default function MyOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isError,
    refetch,
  } = useMyOrders();
  const { data: serviceTypes = [] } = useActiveServiceTypes();
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);

  const [activeTab, setActiveTab] = useState('all');
  // Mặc định "Ưu tiên xử lý": đơn cần hành động lên đầu, lịch sử xuống cuối và
  // mới nhất trước. Nếu mặc định là "sớm nhất" thì đơn cũ nhất trong lịch sử sẽ
  // chiếm đầu danh sách, khiến khách tưởng đó là đơn vừa đặt.
  const [sortBy, setSortBy] = useState<SortId>('priority');
  // ?q= cho phép trang khác (VD: card xe) deep-link thẳng vào kết quả lọc.
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') ?? '',
  );

  // Modal states
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [reschedulingOrder, setReschedulingOrder] = useState<Order | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<
    Record<string, boolean>
  >(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wave_submitted_feedbacks');
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  // Ảnh trước/sau khi rửa đang được phóng to.
  const [photoPreview, setPhotoPreview] = useState<{
    photos: string[];
    index: number;
  } | null>(null);

  // Fetch customer vehicles for name representation
  useEffect(() => {
    getMyVehicles()
      .then((res) => {
        setVehicles(res.data?.data || res.data || []);
      })
      .catch((err) => console.error(err));
  }, []);

  // Realtime: trạng thái đơn đổi (check-in, thanh toán, hủy, no-show) hoặc xe
  // bắt đầu/kết thúc rửa → tải lại danh sách. Toast do NotificationSocketBridge
  // hiển thị từ notification:new — ở đây KHÔNG toast lại để tránh trùng.
  useSocketEvent('order:status', () => refetch());
  useSocketEvent('wash:started', () => refetch());
  useSocketEvent('wash:completed', () => refetch());

  // Alert success booking if redirect from flow - chỉ bắn 1 lần rồi xoá query
  // (tránh chồng toast do React strict mode double-invoke / re-render).
  const successToastShown = useRef(false);
  useEffect(() => {
    if (searchParams.get('success') === 'true' && !successToastShown.current) {
      successToastShown.current = true;
      toast.success('Đặt lịch thành công! Chào mừng bạn đến với WAVE.', {
        id: 'booking-success',
      });
      router.replace('/profile/orders', { scroll: false });
    }
  }, [searchParams, router]);

  const getServiceName = (id: string) => {
    const service = serviceTypes.find(
      (s: ServiceTypeOption) => (s._id || s.id) === id,
    );
    return service?.name || 'Gói dịch vụ';
  };

  /**
   * Tên dịch vụ của một đơn. Ưu tiên `serviceName` BE trả kèm đơn: danh sách
   * `/service-types` chỉ có dịch vụ ĐANG hoạt động, nên đơn cũ đặt bằng dịch vụ
   * đã ngưng sẽ tra không ra và rơi về nhãn chung "Gói dịch vụ".
   */
  const serviceNameOf = (order: Order) =>
    order.serviceName || getServiceName(order.serviceTypeId);

  const getVehicleInfo = (id: string) => {
    const vehicle = vehicles.find((v) => (v._id || v.id) === id);
    if (!vehicle) return { name: 'Phương tiện', plate: '' };
    return {
      name: capitalizeWords(vehicle.nickname || vehicle.brand) || 'Xe của tôi',
      plate: vehicle.licensePlate || '',
    };
  };

  // Đếm số đơn mỗi tab để hiển thị ngay trên nhãn tab.
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TAB_GROUPS) {
      counts[tab.id] = orders.filter((o: Order) =>
        tab.statuses.includes(o.status),
      ).length;
    }
    return counts;
  }, [orders]);

  const pendingCount = tabCounts['pending'] ?? 0;

  // Lọc theo tab + từ khóa, sau đó sắp xếp theo lựa chọn.
  const filteredOrders = useMemo(() => {
    const tab = TAB_GROUPS.find((t) => t.id === activeTab) ?? TAB_GROUPS[0];
    let result = orders.filter((o: Order) => tab.statuses.includes(o.status));

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const qPlate = q.replace(/[^a-z0-9]/g, '');
      result = result.filter((o: Order) => {
        const vInfo = getVehicleInfo(o.vehicleId);
        const plate = vInfo.plate || o.licensePlate || '';
        const plateNorm = plate.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          serviceNameOf(o).toLowerCase().includes(q) ||
          vInfo.name.toLowerCase().includes(q) ||
          (qPlate.length > 0 && plateNorm.includes(qPlate))
        );
      });
    }

    const bySoonest = (a: Order, b: Order) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    const byNewest = (a: Order, b: Order) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();

    switch (sortBy) {
      case 'priority':
        // Cần xử lý trước → sắp diễn ra (gần nhất trước) → lịch sử (mới nhất trước).
        result = [...result].sort((a, b) => {
          const rankDiff = priorityRank(a.status) - priorityRank(b.status);
          if (rankDiff !== 0) return rankDiff;
          return priorityRank(a.status) === 2 ? byNewest(a, b) : bySoonest(a, b);
        });
        break;
      case 'soonest':
        result = [...result].sort(bySoonest);
        break;
      case 'newest':
        result = [...result].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'oldest':
        result = [...result].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
      case 'price-asc':
        result = [...result].sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
    }
    return result;
    // getVehicleInfo/getServiceName đổi theo vehicles/serviceTypes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, activeTab, sortBy, searchQuery, vehicles, serviceTypes]);

  // Phân trang phía client (BE trả toàn bộ đơn của khách).
  const ORDERS_PER_PAGE = 8;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages);
  const pagedOrders = useMemo(
    () =>
      filteredOrders.slice(
        (safePage - 1) * ORDERS_PER_PAGE,
        safePage * ORDERS_PER_PAGE,
      ),
    [filteredOrders, safePage],
  );

  const markFeedbackSubmitted = (orderId: string) => {
    const updated = { ...submittedFeedbacks, [orderId]: true };
    setSubmittedFeedbacks(updated);
    localStorage.setItem('wave_submitted_feedbacks', JSON.stringify(updated));
  };

  return (
    <div className='space-y-5'>
      {/* Title */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4'>
        <div>
          <h1 className='font-heading text-xl font-bold text-foreground'>
            Lịch sử rửa xe
          </h1>
          <p className='text-sm text-muted-foreground'>
            Theo dõi và quản lý lịch hẹn rửa xe của bạn tại WAVE
          </p>
        </div>
        <Button
          onClick={() => router.push('/booking')}
          className='bg-primary hover:bg-primary/95 text-white rounded-xl px-5 py-2.5 font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer'
        >
          Đặt lịch ngay
        </Button>
      </div>

      {/* Cảnh báo đơn chờ thanh toán */}
      {pendingCount > 0 && activeTab !== 'pending' && (
        <button
          type='button'
          onClick={() => {
            setActiveTab('pending');
            setPage(1);
          }}
          className='w-full flex items-center gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/30 text-left cursor-pointer hover:bg-warning/15 transition-colors'
        >
          <AlertCircle className='w-4 h-4 text-warning shrink-0' />
          <span className='text-xs font-semibold text-foreground flex-1'>
            Bạn có {pendingCount} lịch đang chờ thanh toán
          </span>
          <span className='text-xs font-bold text-warning shrink-0'>
            Xem ngay →
          </span>
        </button>
      )}

      {/* Tabs nhóm trạng thái, kèm số lượng */}
      <div
        className='flex gap-1.5 overflow-x-auto border-b border-border pb-1.5 scrollbar-none'
        role='tablist'
        aria-label='Lọc theo trạng thái'
      >
        {TAB_GROUPS.filter(
          (tab) => tab.id !== 'pending' || pendingCount > 0,
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role='tab'
              aria-selected={isActive}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={cn(
                'text-xs font-bold px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 border border-transparent inline-flex items-center gap-1.5',
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                  isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                {tabCounts[tab.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: tìm kiếm + sắp xếp + tổng kết quả */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-2.5'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-placeholder' />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder='Tìm theo dịch vụ, tên xe hoặc biển số...'
            className='pl-9 h-9 rounded-xl text-xs bg-card'
            aria-label='Tìm kiếm lịch hẹn'
          />
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <label
            htmlFor='order-sort'
            className='text-xs font-semibold text-muted-foreground inline-flex items-center gap-1'
          >
            <ArrowUpDown className='w-3.5 h-3.5' />
            Sắp xếp
          </label>
          <select
            id='order-sort'
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortId);
              setPage(1);
            }}
            className='h-9 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer'
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main orders list */}
      {isLoadingOrders ? (
        <div className='flex flex-col items-center justify-center py-20 gap-3'>
          <Spinner className='size-10 text-primary' />
          <span className='text-sm text-muted-foreground'>
            Đang tải danh sách lịch đặt...
          </span>
        </div>
      ) : isError ? (
        <Card className='border border-dashed border-destructive/40 py-14 text-center rounded-2xl bg-card'>
          <CardContent className='flex flex-col items-center justify-center gap-3'>
            <AlertCircle className='w-10 h-10 text-destructive/60' />
            <p className='font-bold text-foreground'>Không tải được danh sách</p>
            <p className='text-xs text-muted-foreground max-w-xs'>
              Có lỗi khi kết nối máy chủ. Kiểm tra mạng rồi thử lại.
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              className='rounded-xl text-xs font-semibold mt-1'
            >
              <RefreshCw className='w-3.5 h-3.5 mr-1' /> Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className='border border-dashed border-border py-14 text-center rounded-2xl bg-card'>
          <CardContent className='flex flex-col items-center justify-center gap-3'>
            <Calendar className='w-10 h-10 text-muted-foreground/60' />
            {orders.length === 0 ? (
              <>
                <p className='font-bold text-foreground'>Chưa có lịch hẹn nào</p>
                <p className='text-xs text-muted-foreground max-w-xs'>
                  Đặt lịch rửa xe đầu tiên để bắt đầu tích điểm thành viên.
                </p>
                <Button
                  onClick={() => router.push('/booking')}
                  size='sm'
                  className='rounded-xl text-xs font-bold mt-1'
                >
                  Đặt lịch ngay
                </Button>
              </>
            ) : (
              <>
                <p className='font-bold text-foreground'>
                  Không tìm thấy lịch hẹn nào
                </p>
                <p className='text-xs text-muted-foreground max-w-xs'>
                  Không có lịch hẹn khớp bộ lọc hiện tại. Thử đổi tab hoặc xóa từ
                  khóa tìm kiếm.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          <p className='text-xs text-muted-foreground font-medium'>
            {filteredOrders.length} lịch hẹn
            {searchQuery.trim() && ` khớp “${searchQuery.trim()}”`}
          </p>

          {pagedOrders.map((order: Order) => {
            const vInfo = getVehicleInfo(order.vehicleId);
            // Biển số BE trả kèm đơn là ảnh chụp tại thời điểm đặt - vẫn đúng cả
            // khi xe đã bị xoá khỏi danh sách phương tiện.
            const plate = vInfo.plate || order.licensePlate || '';
            const statusMeta = ORDER_STATUS_META[order.status];
            const paymentMeta = PAYMENT_STATUS_META[order.paymentStatus];
            const isPendingPayment = order.status === 'pending_payment';
            const canModify = isCancellableByCustomer(order.status);
            // BE quyết định đơn có được chấm điểm hay không (`canRate`) và đã
            // chấm chưa (`alreadyRated`) - không suy từ mỗi trạng thái đơn.
            const alreadyRated =
              order.alreadyRated === true || !!submittedFeedbacks[order.id];
            const canRate = order.canRate === true && !alreadyRated;
            // Chỉ đơn đã có phiếu rửa mới có ảnh - tránh gọi thừa API cho đơn
            // chưa từng check-in.
            const hasWorkOrder = !!order.workOrderStatus;

            const timeStr = new Date(order.scheduledAt).toLocaleTimeString(
              'vi-VN',
              { hour: '2-digit', minute: '2-digit', hour12: false },
            );
            const dateStr = new Date(order.scheduledAt).toLocaleDateString(
              'vi-VN',
              { day: '2-digit', month: '2-digit', year: 'numeric' },
            );

            return (
              <Card
                key={order.id}
                className={cn(
                  'relative border rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-primary/40 transition-all bg-card py-0 gap-0',
                  isPendingPayment ? 'border-warning/40' : 'border-border/80',
                )}
              >
                {/* Link phủ toàn card - mọi hành động bên trong đặt z-10 lên trên. */}
                <Link
                  href={`/profile/orders/${order.id}`}
                  className='absolute inset-0 z-0'
                  aria-label={`Xem chi tiết lịch hẹn ${serviceNameOf(order)} ngày ${dateStr}`}
                />
                <CardContent className='p-4 sm:p-5 space-y-3 pointer-events-none'>
                  {/* Dòng 1: dịch vụ + trạng thái */}
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <h3 className='font-bold text-sm text-foreground leading-snug'>
                        {serviceNameOf(order)}
                      </h3>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {vInfo.name}
                        {plate && (
                          <>
                            {' · '}
                            <span className='font-mono font-semibold text-foreground/80'>
                              {formatLicensePlate(plate)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                  </div>

                  {/* Dòng 2: thời gian · thanh toán · số tiền */}
                  <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-3'>
                    <span className='inline-flex items-center gap-1.5'>
                      <Calendar className='w-3.5 h-3.5 shrink-0' />
                      <span className='font-semibold text-foreground'>
                        {dateStr} · {timeStr}
                      </span>
                    </span>
                    <span className='inline-flex items-center gap-1.5'>
                      <CreditCard className='w-3.5 h-3.5 shrink-0' />
                      {order.paymentMethod === 'online'
                        ? 'Chuyển khoản'
                        : 'Tiền mặt'}
                      {' · '}
                      {/* `no_payment_required` = ưu đãi phủ hết đơn, coi như đã tất toán. */}
                      <span
                        className={cn(
                          'font-semibold',
                          isSettledPayment(order.paymentStatus) ||
                            Number(order.amount) === 0
                            ? 'text-success'
                            : 'text-foreground',
                        )}
                      >
                        {Number(order.amount) === 0
                          ? 'Miễn phí'
                          : paymentMeta.label}
                      </span>
                    </span>
                    <span className='ml-auto font-bold text-sm text-foreground font-mono'>
                      {formatCurrency(order.amount)}
                    </span>
                  </div>

                  {/* Ảnh hiện trạng xe trước & sau khi rửa. Tự ẩn nếu chưa có ảnh. */}
                  {hasWorkOrder && (
                    <div className='pointer-events-auto relative z-10'>
                      <OrderWashPhotos
                        orderId={order.id}
                        onPreview={(photos, index) =>
                          setPhotoPreview({ photos, index })
                        }
                      />
                    </div>
                  )}

                  {/* Dòng 3: hành động theo ngữ cảnh + xem chi tiết */}
                  <div className='flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 pointer-events-auto relative z-10'>
                    {isPendingPayment && order.payosCheckoutUrl && (
                      <Button
                        size='sm'
                        onClick={() =>
                          (window.location.href = order.payosCheckoutUrl!)
                        }
                        className='bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-8 px-3.5 cursor-pointer shadow-xs'
                      >
                        Thanh toán ngay
                      </Button>
                    )}

                    {canRate && (
                      <Button
                        size='sm'
                        onClick={() => setFeedbackOrder(order)}
                        className='bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-8 px-3.5 cursor-pointer shadow-xs'
                      >
                        Đánh giá dịch vụ
                      </Button>
                    )}

                    {alreadyRated && (
                      <span className='text-xs font-semibold text-success inline-flex items-center gap-1'>
                        <CheckCircle className='w-3.5 h-3.5' /> Đã gửi đánh giá
                        {typeof order.orderRating === 'number' && (
                          <span className='font-bold'>
                            · {order.orderRating}★
                          </span>
                        )}
                      </span>
                    )}

                    {canModify && (
                      <>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setReschedulingOrder(order)}
                          className='rounded-xl text-xs font-semibold h-8 px-3 border-border hover:bg-muted cursor-pointer'
                        >
                          Đổi lịch
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setCancellingOrder(order)}
                          className='rounded-xl text-xs font-semibold h-8 px-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer'
                        >
                          Hủy lịch
                        </Button>
                      </>
                    )}

                    <Link
                      href={`/profile/orders/${order.id}`}
                      className='ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:underline underline-offset-2'
                    >
                      Xem chi tiết
                      <ChevronRight className='w-3.5 h-3.5' />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            className='pt-2'
          />
        </div>
      )}

      {/* Modals dùng chung với trang chi tiết */}
      {reschedulingOrder && (
        <RescheduleOrderModal
          order={reschedulingOrder}
          vehicles={vehicles}
          serviceName={serviceNameOf(reschedulingOrder)}
          onClose={() => setReschedulingOrder(null)}
          onDone={() => refetch()}
        />
      )}

      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onDone={() => refetch()}
        />
      )}

      {feedbackOrder && (
        <FeedbackOrderModal
          order={feedbackOrder}
          washerName={feedbackOrder.assignedWasherName}
          onClose={() => setFeedbackOrder(null)}
          onDone={() => markFeedbackSubmitted(feedbackOrder.id)}
        />
      )}

      {photoPreview && (
        <OrderPhotoLightbox
          photos={photoPreview.photos}
          index={photoPreview.index}
          onClose={() => setPhotoPreview(null)}
          onChangeIndex={(next) =>
            setPhotoPreview((p) => (p ? { ...p, index: next } : p))
          }
        />
      )}
    </div>
  );
}
