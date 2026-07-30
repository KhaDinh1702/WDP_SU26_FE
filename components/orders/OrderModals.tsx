'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  XCircle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  useCancelOrder,
  useRescheduleOrder,
  useAvailableSlots,
  useMyOrders,
} from '@/hooks/orders/useOrders';
import { submitFeedback } from '@/lib/customer-api';
import { cn } from '@/lib/utils';
import { toLocalDateKey } from '@/lib/format';
import {
  findVehicleBusyConflict,
  getRescheduleLimitReached,
  getVehicleBusyRanges,
} from '@/lib/order-rules';
import { FEEDBACK_RATING_LABEL } from '@/constants';
import { Order, AvailableSlot } from '@/types/order';
import type { Feedback } from '@/types/feedback';

/** Xe của khách - shape tối thiểu các modal cần. */
export interface CustomerVehicle {
  _id?: string;
  id?: string;
  nickname?: string;
  brand?: string;
  licensePlate?: string;
  vehicleTypeId?: string;
}

/* ─────────────────── MODAL ĐỔI LỊCH ─────────────────── */

export function RescheduleOrderModal({
  order,
  vehicles,
  serviceName,
  onClose,
  onDone,
}: {
  order: Order;
  vehicles: CustomerVehicle[];
  serviceName: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const rescheduleMutation = useRescheduleOrder();
  const [rescheduleDate, setRescheduleDate] = useState(() =>
    toLocalDateKey(new Date()),
  );
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  // 7 ngày kế tiếp cho dropdown chọn ngày.
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const current = new Date(today);
      current.setDate(today.getDate() + i);
      const val = toLocalDateKey(current);
      const lbl =
        current.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        }) +
        ' (' +
        (i === 0
          ? 'Hôm nay'
          : i === 1
            ? 'Ngày mai'
            : current.toLocaleDateString('vi-VN', { weekday: 'short' })) +
        ')';
      dates.push({ value: val, label: lbl });
    }
    return dates;
  }, []);

  const slotQueryParams = useMemo(() => {
    if (!rescheduleDate) {
      return {
        serviceTypeId: '',
        vehicleTypeId: '',
        from: '',
        to: '',
        enabled: false,
      };
    }
    const vehicle = vehicles.find((v) => (v._id || v.id) === order.vehicleId);
    return {
      serviceTypeId: order.serviceTypeId,
      vehicleTypeId: vehicle?.vehicleTypeId || '',
      // Biên ngày lấy theo giờ địa phương rồi đổi sang UTC (giống trang đặt lịch);
      // ghép thẳng hậu tố 'Z' sẽ khiến khoảng truy vấn lệch đúng bằng offset múi giờ.
      from: new Date(`${rescheduleDate}T00:00:00`).toISOString(),
      to: new Date(`${rescheduleDate}T23:59:59.999`).toISOString(),
      enabled: !!rescheduleDate && !!vehicle?.vehicleTypeId,
    };
  }, [order, rescheduleDate, vehicles]);

  const { data: availableSlots = [], isLoading: isLoadingSlots } =
    useAvailableSlots(slotQueryParams);

  // BE từ chối đổi lịch sang giờ mà CHÍNH chiếc xe này đã có lịch rửa khác
  // (409). Dựng lại các khoảng đã bị chiếm để disable trước — trừ chính đơn đang
  // đổi, vì lịch cũ của nó sẽ được nhả ra.
  const { data: myOrders = [] } = useMyOrders();
  const vehicleBusyRanges = useMemo(
    () =>
      getVehicleBusyRanges(myOrders as Order[], {
        vehicleId: order.vehicleId,
        excludeOrderId: order.id || order._id,
      }),
    [myOrders, order],
  );

  // Chọn lại đúng giờ đang hẹn thì không phải là đổi lịch — khoá luôn ô đó cho
  // khách khỏi phân vân (và khỏi tốn một lượt đổi vào một request vô nghĩa).
  const currentSlotMs = new Date(order.scheduledAt).getTime();
  const isCurrentSlot = (slotIso: string) =>
    new Date(slotIso).getTime() === currentSlotMs;

  const selectedSlotConflict = rescheduleSlot
    ? findVehicleBusyConflict(
        rescheduleSlot,
        order.estimatedMinutes,
        vehicleBusyRanges,
      )
    : undefined;
  const effectiveSlot =
    selectedSlotConflict || (rescheduleSlot && isCurrentSlot(rescheduleSlot))
      ? ''
      : rescheduleSlot;

  // Lưới giờ có thể cuộn nên ô đang chọn hay bị khuất — nhắc lại giờ mới ngay
  // cạnh lịch cũ để khách luôn thấy mình đang đổi sang khung nào.
  const selectedSlotLabel = effectiveSlot
    ? `${new Date(effectiveSlot).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })} ngày ${new Date(effectiveSlot).toLocaleDateString('vi-VN')}`
    : '';

  const handleSubmit = async () => {
    if (!effectiveSlot) return;
    try {
      toast.loading('Đang xử lý đổi lịch...');
      // Ca trực là ẩn danh: khách chọn giờ, BE tự tìm ca còn chỗ phủ giờ đó
      // (giống lúc đặt lịch). FE không đoán ca nữa.
      await rescheduleMutation.mutateAsync({
        id: order.id,
        data: { scheduledAt: effectiveSlot },
      });
      toast.dismiss();
      toast.success('Đã đổi lịch thành công!');
      onClose();
      onDone?.();
    } catch (error) {
      toast.dismiss();
      console.error(error);
      const limitReached = getRescheduleLimitReached(error);
      if (limitReached !== null) {
        toast.error(
          `Lịch hẹn này đã hết số lần đổi (tối đa ${limitReached} lần)`,
          {
            description:
              'Lịch cũ vẫn được giữ nguyên. Nếu bạn vẫn cần giờ khác, hãy hủy lịch hẹn này rồi đặt lịch mới.',
            duration: 8000,
          },
        );
        return;
      }
      toast.error('Không thể đổi lịch.', {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200'>
      <Card className='w-full max-w-lg border-none shadow-2xl rounded-xl overflow-hidden bg-card py-0 gap-0 animate-in zoom-in-95 duration-200'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between border-b border-border pb-3 mb-5'>
            <h3 className='font-heading text-base font-bold text-foreground flex items-center gap-2'>
              <Calendar className='w-5 h-5 text-primary' /> Đổi lịch hẹn rửa xe
            </h3>
            <button
              onClick={onClose}
              aria-label='Đóng'
              className='p-1 text-placeholder hover:text-muted-foreground cursor-pointer'
            >
              <XCircle className='w-5 h-5' />
            </button>
          </div>

          <div className='space-y-4'>
            <div className='bg-muted/40 p-3 rounded-xl border border-border space-y-1'>
              <span className='font-semibold text-sm text-foreground block'>
                {serviceName}
              </span>
              <span className='text-[10px] text-placeholder font-semibold block'>
                Lịch cũ:{' '}
                {new Date(order.scheduledAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ngày {new Date(order.scheduledAt).toLocaleDateString('vi-VN')}
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold block',
                  selectedSlotLabel ? 'text-primary' : 'text-placeholder',
                )}
              >
                Lịch mới: {selectedSlotLabel || 'Chưa chọn giờ mới'}
              </span>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'>
                Chọn ngày mới
              </Label>
              <select
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setRescheduleSlot('');
                }}
                className='w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
              >
                {dateOptions.map((d) => (
                  <option
                    key={d.value}
                    value={d.value}
                  >
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2 pt-1'>
              <Label className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'>
                Chọn giờ còn trống
              </Label>

              {isLoadingSlots ? (
                <div className='flex justify-center items-center py-8'>
                  <Spinner className='size-6 text-primary' />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className='text-xs text-warning font-bold bg-warning/10 p-3 border border-warning/30 rounded-xl text-center'>
                  Không có ca trống nào vào ngày này. Vui lòng chọn ngày khác.
                </p>
              ) : (
                <div className='grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-40 overflow-y-auto pr-1'>
                  {availableSlots.map((slot: AvailableSlot) => {
                    const isSelected = slot.scheduledAt === effectiveSlot;
                    // Giờ đơn đang hẹn — khoá trước cả các lý do khác vì với
                    // khách nó là "lịch hiện tại", không phải ô hết chỗ/trùng.
                    const isCurrent = isCurrentSlot(slot.scheduledAt);
                    const isFull = !isCurrent && slot.remainingCapacity <= 0;
                    // Xe này đã có lịch rửa chồng lấn giờ đó → BE trả 409.
                    const isBusy =
                      !isCurrent &&
                      !isFull &&
                      !!findVehicleBusyConflict(
                        slot.scheduledAt,
                        order.estimatedMinutes,
                        vehicleBusyRanges,
                      );
                    const isDisabled = isCurrent || isFull || isBusy;
                    const timeStr = new Date(
                      slot.scheduledAt,
                    ).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });
                    return (
                      <button
                        key={slot.scheduledAt}
                        type='button'
                        disabled={isDisabled}
                        onClick={() => setRescheduleSlot(slot.scheduledAt)}
                        className={cn(
                          'p-2.5 rounded-xl border-2 transition-all text-center cursor-pointer focus:outline-none flex flex-col items-center justify-center',
                          isSelected
                            ? 'border-primary bg-accent ring-1 ring-primary'
                            : isDisabled
                              ? 'border-border bg-muted text-placeholder cursor-not-allowed'
                              : 'border-border bg-card hover:bg-muted/50',
                        )}
                      >
                        <span
                          className={cn(
                            'font-semibold text-xs tabular-nums',
                            isSelected
                              ? 'text-primary'
                              : isDisabled
                                ? 'text-placeholder'
                                : 'text-foreground',
                          )}
                        >
                          {timeStr}
                        </span>
                        {/* Nút disabled có `pointer-events-none` nên tooltip
                            `title` không hiện — ghi lý do ra ô. */}
                        <span
                          className={cn(
                            'text-[8px] font-bold mt-0.5',
                            isCurrent || isBusy
                              ? 'text-placeholder'
                              : 'text-success',
                          )}
                        >
                          {isCurrent
                            ? 'Lịch hiện tại'
                            : isBusy
                              ? 'Trùng lịch'
                              : `Trống ${slot.remainingCapacity}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSlotConflict && (
                <p className='text-[11px] font-semibold text-warning bg-warning/10 border border-warning/30 rounded-xl p-2.5'>
                  Xe này đã có lịch rửa lúc{' '}
                  {new Date(
                    selectedSlotConflict.order.scheduledAt,
                  ).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}{' '}
                  trùng với khung giờ vừa chọn. Vui lòng chọn giờ khác.
                </p>
              )}
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-5 border-t border-border mt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='rounded-xl text-xs font-semibold px-4 h-9 cursor-pointer'
            >
              Quay lại
            </Button>
            <Button
              disabled={!effectiveSlot || rescheduleMutation.isPending}
              onClick={handleSubmit}
              className='bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold px-5 h-9 cursor-pointer'
            >
              Xác nhận đổi lịch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────── MODAL HỦY LỊCH ─────────────────── */

export function CancelOrderModal({
  order,
  onClose,
  onDone,
}: {
  order: Order;
  onClose: () => void;
  onDone?: () => void;
}) {
  const cancelMutation = useCancelOrder();
  const [cancelReason, setCancelReason] = useState('');

  const handleSubmit = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: order.id,
        data: { reason: cancelReason.trim() || undefined },
      });
      toast.success('Đã hủy lịch thành công!');
      onClose();
      onDone?.();
    } catch (error) {
      console.error(error);
      toast.error('Không thể hủy lịch.', {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200'>
      <Card className='w-full max-w-md border-none shadow-2xl rounded-xl overflow-hidden bg-card py-0 gap-0 animate-in zoom-in-95 duration-200'>
        <CardContent className='p-6'>
          <div className='flex items-start gap-3 mb-4'>
            <div className='p-2.5 rounded-full bg-destructive/10 text-destructive mt-0.5'>
              <AlertCircle className='w-5 h-5' />
            </div>
            <div className='space-y-1'>
              <h3 className='font-heading text-base font-bold text-foreground'>
                Bạn muốn hủy lịch rửa xe này?
              </h3>
              <p className='text-xs text-muted-foreground leading-normal'>
                Lịch hẹn vào lúc{' '}
                <span className='font-bold text-foreground'>
                  {new Date(order.scheduledAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ngày {new Date(order.scheduledAt).toLocaleDateString('vi-VN')}
                </span>{' '}
                sẽ bị hủy bỏ. Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>

          <div className='space-y-2 mb-6'>
            <Label
              htmlFor='cancel-reason'
              className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'
            >
              Lý do hủy lịch (không bắt buộc)
            </Label>
            <Input
              id='cancel-reason'
              placeholder='VD: Thay đổi kế hoạch đột xuất, có việc bận...'
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className='rounded-xl border-border/50 bg-card transition-all text-xs'
            />
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t border-border'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='rounded-xl text-xs font-semibold px-4 h-9 cursor-pointer'
              disabled={cancelMutation.isPending}
            >
              Giữ lịch hẹn
            </Button>
            <Button
              onClick={handleSubmit}
              className='bg-destructive hover:bg-destructive/90 text-white rounded-xl text-xs font-bold px-5 h-9 cursor-pointer'
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Spinner className='size-4' />
              ) : (
                'Xác nhận hủy'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────── MODAL ĐÁNH GIÁ DỊCH VỤ ─────────────────── */

export function FeedbackOrderModal({
  order,
  washerName,
  onClose,
  onDone,
}: {
  order: Order;
  washerName?: string;
  onClose: () => void;
  /**
   * Gọi sau khi gửi thành công - trang cha tự đánh dấu đã đánh giá.
   * Nhận luôn đánh giá BE vừa ghi để hiển thị ngay, khỏi đợi vòng GET mới.
   */
  onDone?: (feedback?: Feedback) => void;
}) {
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const handleSubmit = async () => {
    toast.loading('Đang gửi đánh giá...');
    try {
      const res = await submitFeedback({
        orderId: order.id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || undefined,
      });
      const created: Feedback | undefined =
        res.data?.data ?? res.data ?? undefined;
      toast.dismiss();
      toast.success('Cảm ơn bạn đã gửi đánh giá dịch vụ!');
      onClose();
      onDone?.(created);
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error('Không thể gửi đánh giá.', {
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200'>
      <Card className='w-full max-w-md border-none shadow-2xl rounded-xl overflow-hidden bg-card py-0 gap-0 animate-in zoom-in-95 duration-200'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between border-b border-border pb-3 mb-5'>
            <h3 className='font-heading text-base font-bold text-foreground'>
              Đánh giá chất lượng rửa xe
            </h3>
            <button
              onClick={onClose}
              aria-label='Đóng'
              className='p-1 text-placeholder hover:text-muted-foreground cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='space-y-4'>
            <div className='bg-muted/40 p-3 rounded-xl border border-border flex items-center gap-3'>
              <div className='w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-sm'>
                {washerName?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <span className='text-[10px] text-muted-foreground font-bold uppercase block'>
                  Thợ phụ trách
                </span>
                <span className='font-bold text-foreground text-xs block'>
                  {washerName || 'Chưa phân công'}
                </span>
              </div>
            </div>

            <div className='space-y-2 text-center py-2'>
              <Label className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'>
                Chọn mức độ hài lòng
              </Label>
              <div className='flex justify-center gap-2'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type='button'
                    onClick={() => setFeedbackRating(star)}
                    aria-label={`${star} sao`}
                    aria-pressed={star === feedbackRating}
                    className='focus:outline-none transition-transform hover:scale-110 cursor-pointer'
                  >
                    <Star
                      className={cn(
                        'w-7 h-7 transition-colors',
                        star <= feedbackRating
                          ? 'fill-warning text-warning'
                          : 'fill-transparent text-muted-foreground/40',
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className='text-xs font-semibold text-foreground block'>
                {FEEDBACK_RATING_LABEL[feedbackRating]} ({feedbackRating} sao)
              </span>
            </div>

            <div className='space-y-1.5'>
              <Label
                htmlFor='feedback-comment'
                className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'
              >
                Nhận xét của bạn
              </Label>
              <textarea
                id='feedback-comment'
                placeholder='VD: Thợ rửa rất sạch, nhiệt tình, đúng giờ...'
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                className='w-full border border-border rounded-xl p-3 text-xs focus:outline-none focus:border-primary transition-all resize-none placeholder:text-placeholder'
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-5 border-t border-border mt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='rounded-xl text-xs font-semibold px-4 h-9 cursor-pointer'
            >
              Để sau
            </Button>
            <Button
              onClick={handleSubmit}
              className='bg-success hover:bg-success/90 text-white rounded-xl text-xs font-bold px-5 h-9 cursor-pointer'
            >
              Gửi đánh giá
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────── LIGHTBOX ẢNH TRƯỚC/SAU KHI RỬA ─────────────────── */

export function OrderPhotoLightbox({
  photos,
  index,
  onClose,
  onChangeIndex,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
  onChangeIndex: (next: number) => void;
}) {
  return (
    <div
      className='fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150'
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt='Ảnh rửa xe phóng to'
        onClick={(e) => e.stopPropagation()}
        className='max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl'
      />

      <button
        type='button'
        onClick={onClose}
        aria-label='Đóng'
        className='absolute top-5 right-5 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 cursor-pointer'
      >
        <X className='w-5 h-5' />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type='button'
            aria-label='Ảnh trước'
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((index - 1 + photos.length) % photos.length);
            }}
            className='absolute left-5 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 cursor-pointer'
          >
            <ChevronLeft className='w-6 h-6' />
          </button>
          <button
            type='button'
            aria-label='Ảnh kế tiếp'
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((index + 1) % photos.length);
            }}
            className='absolute right-5 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 cursor-pointer'
          >
            <ChevronRight className='w-6 h-6' />
          </button>
          <span className='absolute bottom-6 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white'>
            {index + 1}/{photos.length}
          </span>
        </>
      )}
    </div>
  );
}
