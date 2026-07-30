'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Calendar,
  AlertCircle,
  Info,
  Star,
  XCircle,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OrderWashPhotos } from '@/components/orders/OrderWashPhotos';
import {
  RescheduleOrderModal,
  CancelOrderModal,
  FeedbackOrderModal,
  OrderPhotoLightbox,
  CustomerVehicle,
} from '@/components/orders/OrderModals';
import {
  useMyOrderDetail,
  useActiveServiceTypes,
} from '@/hooks/orders/useOrders';
import { getMyVehicles } from '@/lib/customer-api';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLicensePlate,
  capitalizeWords,
} from '@/lib/format';
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  PAYMENT_STATUS_META,
  PAYMENT_METHOD_LABEL,
  isCancellableByCustomer,
  isReschedulableByCustomer,
  MAX_CUSTOMER_RESCHEDULE,
  isSettledPayment,
} from '@/constants';
import { Order, OrderStatus, ServiceType } from '@/types/order';

/** Các mốc của một lịch rửa xe suôn sẻ, theo đúng state machine BE. */
const TIMELINE_STEPS = [
  { id: 'booked', label: 'Đã đặt lịch' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'checked_in', label: 'Tiếp nhận xe' },
  { id: 'washing', label: 'Đang rửa' },
  { id: 'completed', label: 'Hoàn thành' },
] as const;

/**
 * Mốc cuối cùng ĐÃ hoàn tất theo trạng thái đơn. Mốc kế tiếp là "đang chờ".
 * in_progress: xe đang rửa → mốc "Đang rửa" là bước hiện tại, chưa tick.
 */
function lastDoneStep(status: OrderStatus): number {
  switch (status) {
    case 'pending_payment':
      return 0;
    case 'confirmed':
      return 1;
    case 'checked_in':
      return 2;
    case 'in_progress':
      return 2;
    case 'completed':
      return 4;
    default:
      return -1;
  }
}

/** Mã lịch hẹn ngắn thân thiện, đủ để đọc cho nhân viên khi cần đối chiếu. */
function orderCode(id: string): string {
  return `WAVE-${id.slice(-6).toUpperCase()}`;
}

function InfoRow({
  label,
  children,
  highlight = false,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className='flex items-baseline justify-between gap-4 py-1.5'>
      <span className='text-xs text-muted-foreground shrink-0'>{label}</span>
      <span
        className={cn(
          'text-xs text-right',
          highlight
            ? 'font-bold text-foreground text-sm'
            : 'font-semibold text-foreground',
        )}
      >
        {children}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className='border border-border rounded-2xl shadow-xs bg-card py-0 gap-0'>
      <CardContent className='p-4 sm:p-5'>
        <h2 className='text-[11px] font-bold uppercase tracking-wider text-placeholder mb-2'>
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params?.id ?? '';

  const {
    data: orderRaw,
    isLoading,
    isError,
    refetch,
  } = useMyOrderDetail(orderId);
  const order: Order | null = orderRaw?.data ?? orderRaw ?? null;

  const { data: serviceTypes = [] } = useActiveServiceTypes();
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFeedbacking, setIsFeedbacking] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{
    photos: string[];
    index: number;
  } | null>(null);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<
    Record<string, boolean>
  >(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wave_submitted_feedbacks');
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  useEffect(() => {
    getMyVehicles()
      .then((res) => setVehicles(res.data?.data || res.data || []))
      .catch((err) => console.error(err));
  }, []);

  // Realtime cho CHÍNH đơn này: kiểm tra định danh trong payload trước khi
  // refetch để không tải lại vì đơn khác của cùng tài khoản thay đổi.
  // - order:status payload = OrderResponseDto (id = orderId)
  // - wash:*      payload = WorkOrderResponseDto (orderId)
  useSocketEvent<{ id?: string }>('order:status', (p) => {
    if (p?.id === orderId) refetch();
  });
  useSocketEvent<{ orderId?: string }>('wash:started', (p) => {
    if (p?.orderId === orderId) refetch();
  });
  useSocketEvent<{ orderId?: string }>('wash:completed', (p) => {
    if (p?.orderId === orderId) refetch();
  });

  const service: ServiceType | undefined = useMemo(
    () =>
      serviceTypes.find(
        (s: ServiceType & { _id?: string }) =>
          (s.id || s._id) === order?.serviceTypeId,
      ),
    [serviceTypes, order?.serviceTypeId],
  );

  const vehicle = useMemo(
    () => vehicles.find((v) => (v._id || v.id) === order?.vehicleId),
    [vehicles, order?.vehicleId],
  );

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-24 gap-3'>
        <Spinner className='size-10 text-primary' />
        <span className='text-sm text-muted-foreground'>
          Đang tải chi tiết lịch hẹn...
        </span>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className='space-y-4'>
        <Link
          href='/profile/orders'
          className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors'
        >
          <ArrowLeft className='w-3.5 h-3.5' /> Quay lại lịch sử rửa xe
        </Link>
        <Card className='border border-dashed border-border py-14 text-center rounded-2xl bg-card'>
          <CardContent className='flex flex-col items-center justify-center gap-3'>
            <AlertCircle className='w-10 h-10 text-muted-foreground/60' />
            <p className='font-bold text-foreground'>
              Không tìm thấy lịch hẹn này
            </p>
            <p className='text-xs text-muted-foreground max-w-xs'>
              Lịch hẹn không tồn tại hoặc không thuộc tài khoản của bạn.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMeta = ORDER_STATUS_META[order.status];
  const paymentMeta = PAYMENT_STATUS_META[order.paymentStatus];
  const isTerminatedEarly =
    order.status === 'cancelled' || order.status === 'no_show';
  const doneIdx = lastDoneStep(order.status);
  const canModify = isCancellableByCustomer(order.status);
  // Hết lượt đổi thì vẫn cho hủy, chỉ chặn đổi lịch - gửi lên BE cũng chỉ nhận
  // 400 "Reschedule limit reached".
  const canReschedule = isReschedulableByCustomer(order);
  // BE nói thẳng "không phải thu gì" qua `paymentStatus = no_payment_required`
  // (ưu đãi phủ hết đơn). Số tiền 0đ chỉ là dấu hiệu dự phòng.
  const isFree =
    order.paymentStatus === PAYMENT_STATUS.NO_PAYMENT_REQUIRED ||
    Number(order.amount) === 0;
  // `/service-types` chỉ liệt kê dịch vụ ĐANG hoạt động, nên đơn cũ đặt bằng
  // dịch vụ đã ngưng sẽ tra không ra - ưu tiên tên BE trả kèm đơn.
  const serviceName = order.serviceName || service?.name || 'Gói dịch vụ';
  const estimatedMinutes =
    order.estimatedMinutes ??
    service?.vehiclePricing?.find(
      (p) => p.vehicleTypeId === vehicle?.vehicleTypeId,
    )?.estimatedMinutes ??
    service?.estimatedMinutes;

  // BE quyết định đơn có được chấm điểm hay không, không suy từ trạng thái đơn.
  const alreadyRated =
    order.alreadyRated === true || !!submittedFeedbacks[order.id];
  const canRate = order.canRate === true && !alreadyRated;

  const timeStr = new Date(order.scheduledAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className='space-y-4'>
      {/* Điều hướng ngược + header */}
      <Link
        href='/profile/orders'
        className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors'
      >
        <ArrowLeft className='w-3.5 h-3.5' /> Quay lại lịch sử rửa xe
      </Link>

      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-border pb-4'>
        <div className='space-y-1.5'>
          <p className='text-[11px] font-bold uppercase tracking-wider text-placeholder'>
            Mã lịch hẹn: <span className='font-mono'>{orderCode(order.id)}</span>
          </p>
          <div className='flex flex-wrap items-center gap-2.5'>
            <h1 className='font-heading text-xl font-bold text-foreground'>
              {serviceName}
            </h1>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
          </div>
          <p className='text-sm text-muted-foreground inline-flex items-center gap-1.5'>
            <Calendar className='w-4 h-4' />
            <span className='font-semibold text-foreground'>
              {formatDate(order.scheduledAt)} · {timeStr}
            </span>
          </p>
        </div>

        {/* Hành động chính đặt ngay đầu trang */}
        <div className='flex flex-wrap items-center gap-2 shrink-0'>
          {order.status === 'pending_payment' && order.payosCheckoutUrl && (
            <Button
              size='sm'
              onClick={() => (window.location.href = order.payosCheckoutUrl!)}
              className='bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-9 px-4 cursor-pointer'
            >
              Thanh toán ngay
            </Button>
          )}
          {canRate && (
            <Button
              size='sm'
              onClick={() => setIsFeedbacking(true)}
              className='bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold h-9 px-4 cursor-pointer'
            >
              <Star className='w-3.5 h-3.5 mr-1' /> Đánh giá dịch vụ
            </Button>
          )}
          {canModify && (
            <>
              <Button
                size='sm'
                variant='outline'
                disabled={!canReschedule}
                onClick={() => setIsRescheduling(true)}
                className='rounded-xl text-xs font-semibold h-9 px-3.5 cursor-pointer'
              >
                Đổi lịch
              </Button>
              {/* Nút disabled có `pointer-events-none` nên tooltip `title`
                  không bao giờ hiện - phải ghi lý do ra ngoài. */}
              {!canReschedule && (
                <span className='text-[10px] font-semibold text-warning'>
                  Đã dùng hết {MAX_CUSTOMER_RESCHEDULE} lần đổi lịch
                </span>
              )}
              <Button
                size='sm'
                variant='outline'
                onClick={() => setIsCancelling(true)}
                className='rounded-xl text-xs font-semibold h-9 px-3.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer'
              >
                Hủy lịch
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tiến trình thực hiện */}
      <SectionCard title='Tiến trình thực hiện'>
        {isTerminatedEarly ? (
          <div className='flex items-start gap-3 py-1'>
            <div className='w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0'>
              <XCircle className='w-4 h-4' />
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-bold text-foreground'>
                {statusMeta.label}
              </p>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {order.status === 'cancelled'
                  ? order.cancelReason
                    ? `Lý do: ${order.cancelReason}`
                    : 'Lịch hẹn đã được hủy.'
                  : 'Bạn không đến cửa hàng vào giờ hẹn nên lịch đã đóng.'}
              </p>
              <p className='text-[11px] text-placeholder mt-1'>
                Cập nhật lúc {formatDateTime(order.updatedAt)}
              </p>
            </div>
          </div>
        ) : (
          <ol className='space-y-0'>
            {TIMELINE_STEPS.map((step, idx) => {
              const isDone = idx <= doneIdx;
              const isCurrent = idx === doneIdx + 1;
              const isLast = idx === TIMELINE_STEPS.length - 1;
              return (
                <li key={step.id} className='flex gap-3'>
                  <div className='flex flex-col items-center'>
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors',
                        isDone
                          ? 'bg-success border-success text-white'
                          : isCurrent
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border text-placeholder',
                      )}
                    >
                      {isDone ? (
                        <Check className='w-3.5 h-3.5' />
                      ) : (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            isCurrent ? 'bg-primary animate-pulse' : 'bg-border',
                          )}
                        />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          'w-0.5 flex-1 min-h-5 my-0.5 rounded-full',
                          idx < doneIdx ? 'bg-success' : 'bg-border',
                        )}
                      />
                    )}
                  </div>
                  <div className={cn('pb-4 min-w-0', isLast && 'pb-0')}>
                    <p
                      className={cn(
                        'text-sm leading-7',
                        isDone || isCurrent
                          ? 'font-bold text-foreground'
                          : 'font-medium text-placeholder',
                      )}
                    >
                      {step.label}
                      {isCurrent && order.status === 'pending_payment' && (
                        <span className='ml-2 text-[11px] font-semibold text-warning'>
                          Chờ thanh toán để xác nhận
                        </span>
                      )}
                      {isCurrent && order.status === 'in_progress' && (
                        <span className='ml-2 text-[11px] font-semibold text-primary'>
                          Xe đang được rửa
                        </span>
                      )}
                    </p>
                    {idx === 0 && (
                      <p className='text-[11px] text-placeholder'>
                        {formatDateTime(order.createdAt)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Thông tin lịch hẹn */}
        <SectionCard title='Thông tin lịch hẹn'>
          <InfoRow label='Ngày hẹn'>{formatDate(order.scheduledAt)}</InfoRow>
          <InfoRow label='Giờ hẹn'>{timeStr}</InfoRow>
          {estimatedMinutes ? (
            <InfoRow label='Thời lượng dự kiến'>
              Khoảng {estimatedMinutes} phút
            </InfoRow>
          ) : null}
          <InfoRow label='Đặt lúc'>{formatDateTime(order.createdAt)}</InfoRow>
          {order.rescheduleCount > 0 && (
            <InfoRow label='Số lần đổi lịch'>
              {order.rescheduleCount}/{MAX_CUSTOMER_RESCHEDULE}
              {order.rescheduleCount >= MAX_CUSTOMER_RESCHEDULE && (
                <span className='text-warning font-semibold'>
                  {' '}
                  · đã hết lượt đổi
                </span>
              )}
            </InfoRow>
          )}
        </SectionCard>

        {/* Phương tiện */}
        <SectionCard title='Phương tiện'>
          {vehicle ? (
            <>
              <InfoRow label='Tên xe'>
                {capitalizeWords(vehicle.nickname || vehicle.brand) ||
                  'Xe của tôi'}
              </InfoRow>
              {vehicle.brand && (
                <InfoRow label='Hãng xe'>
                  {capitalizeWords(vehicle.brand)}
                </InfoRow>
              )}
              <InfoRow label='Biển số'>
                <span className='font-mono'>
                  {formatLicensePlate(vehicle.licensePlate)}
                </span>
              </InfoRow>
            </>
          ) : (
            <p className='text-xs text-muted-foreground py-1.5'>
              Phương tiện đã bị xóa khỏi danh sách xe của bạn.
            </p>
          )}
        </SectionCard>

        {/* Dịch vụ */}
        <SectionCard title='Dịch vụ'>
          <InfoRow label='Gói dịch vụ' highlight>
            {serviceName}
          </InfoRow>
          {service?.description && (
            <p className='text-xs text-muted-foreground pt-1 pb-2'>
              {service.description}
            </p>
          )}
          {service?.checklistTemplate && service.checklistTemplate.length > 0 && (
            <ul className='pt-1 space-y-1'>
              {service.checklistTemplate.map((item) => (
                <li
                  key={item}
                  className='text-xs text-muted-foreground flex items-start gap-1.5'
                >
                  <Check className='w-3.5 h-3.5 text-success shrink-0 mt-px' />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Thanh toán */}
        <SectionCard title='Thanh toán'>
          <InfoRow label='Phương thức'>
            {PAYMENT_METHOD_LABEL[order.paymentMethod]}
          </InfoRow>
          <InfoRow label='Trạng thái'>
            <span
              className={cn(
                isSettledPayment(order.paymentStatus) || isFree
                  ? 'text-success'
                  : 'text-warning',
              )}
            >
              {isFree ? 'Miễn phí (voucher)' : paymentMeta.label}
            </span>
          </InfoRow>
          <div className='border-t border-border mt-1.5 pt-1.5'>
            <InfoRow label='Tổng thanh toán' highlight>
              <span className='font-mono'>{formatCurrency(order.amount)}</span>
            </InfoRow>
          </div>
        </SectionCard>
      </div>

      {/* Ghi chú của khách */}
      {order.note && (
        <SectionCard title='Ghi chú của bạn'>
          <p className='text-xs text-muted-foreground flex items-start gap-2'>
            <Info className='w-4 h-4 text-primary shrink-0' />
            {order.note}
          </p>
        </SectionCard>
      )}

      {/* Thợ phụ trách */}
      {(order.status === 'checked_in' ||
        order.status === 'in_progress' ||
        order.status === 'completed') && (
        <SectionCard title='Thợ rửa xe phụ trách'>
          {order.assignedWasherName ? (
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm'>
                  {order.assignedWasherName[0].toUpperCase()}
                </div>
                <div>
                  <p className='font-bold text-foreground text-sm'>
                    {order.assignedWasherName}
                  </p>
                  {order.assignedWasherPhone && (
                    <p className='text-xs text-muted-foreground'>
                      {order.assignedWasherPhone}
                    </p>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20'>
                <Star className='w-3.5 h-3.5 fill-primary text-primary' />
                {typeof order.assignedWasherAvgRating === 'number'
                  ? order.assignedWasherAvgRating.toFixed(1)
                  : '5.0'}
              </div>
            </div>
          ) : (
            <p className='text-xs text-muted-foreground'>
              Đang chờ phân công thợ.
            </p>
          )}
        </SectionCard>
      )}

      {/* Ảnh trước/sau khi rửa. `workOrderStatus` = đơn đã có phiếu rửa nên có
          thể đã có ảnh, kể cả khi sau đó đơn bị huỷ. */}
      {(!!order.workOrderStatus ||
        order.status === 'checked_in' ||
        order.status === 'in_progress' ||
        order.status === 'completed') && (
        <OrderWashPhotos
          orderId={order.id}
          onPreview={(photos, index) => setPhotoPreview({ photos, index })}
        />
      )}

      {/* Đã đánh giá */}
      {alreadyRated && (
        <p className='text-xs font-semibold text-success inline-flex items-center gap-1.5'>
          <CheckCircle className='w-4 h-4' /> Bạn đã đánh giá lịch rửa xe này
          {typeof order.orderRating === 'number' && ` ${order.orderRating}★`}.
          Cảm ơn bạn!
        </p>
      )}

      {/* Đặt lại dịch vụ sau khi kết thúc */}
      {(order.status === 'completed' || isTerminatedEarly) && (
        <div className='pt-1'>
          <Button
            onClick={() => router.push('/booking')}
            variant='outline'
            className='rounded-xl text-xs font-bold h-9 px-4 cursor-pointer'
          >
            Đặt lại dịch vụ này
          </Button>
        </div>
      )}

      {/* Modals */}
      {isRescheduling && (
        <RescheduleOrderModal
          order={order}
          vehicles={vehicles}
          serviceName={serviceName}
          onClose={() => setIsRescheduling(false)}
          onDone={() => refetch()}
        />
      )}
      {isCancelling && (
        <CancelOrderModal
          order={order}
          onClose={() => setIsCancelling(false)}
          onDone={() => refetch()}
        />
      )}
      {isFeedbacking && (
        <FeedbackOrderModal
          order={order}
          washerName={order.assignedWasherName}
          onClose={() => setIsFeedbacking(false)}
          onDone={() => {
            const updated = { ...submittedFeedbacks, [order.id]: true };
            setSubmittedFeedbacks(updated);
            localStorage.setItem(
              'wave_submitted_feedbacks',
              JSON.stringify(updated),
            );
          }}
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
