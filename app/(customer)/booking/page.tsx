'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import {
  Car,
  Bike,
  Plus,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  AlertCircle,
  Ticket,
  Sparkles,
  X,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getMyVehicles,
  getActiveVehicleTypes,
  createVehicle,
} from '@/lib/customer-api';
import {
  useActiveServiceTypes,
  useAvailableSlots,
  useCreateOrder,
  useMyLoyalty,
  useMyOrders,
  usePreviewOrder,
} from '@/hooks/orders/useOrders';
import { cn } from '@/lib/utils';
import { formatCurrency, toLocalDateKey } from '@/lib/format';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
  activeOrderLimitMessage,
  findVehicleBusyConflict,
  getActiveOrderLimitReached,
  getActiveOrders,
  getVehicleBusyRanges,
  SLOT_STEP_MINUTES,
} from '@/lib/order-rules';
import { MAX_ACTIVE_ORDERS } from '@/constants';
import type {
  ServiceType as ServiceTypeBase,
  AvailableSlot,
  Order,
} from '@/types/order';
import { useVouchers } from '@/hooks/vouchers/useVouchers';
import { Voucher } from '@/types/voucher';
import { getTierLabel } from '@/constants/tiers';
import {
  isVoucherApplicableTo,
  isVoucherUsable,
  voucherBenefitLabel,
  voucherMinOrderLabel,
  voucherTitle,
} from '@/lib/voucher';

type ServiceTypeItem = ServiceTypeBase & { _id?: string };

interface Vehicle {
  id?: string;
  _id?: string;
  vehicleTypeId: string;
  licensePlate: string;
  nickname?: string;
  brand?: string;
  model?: string;
  color?: string;
  isDefault: boolean;
}

interface VehicleType {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
}

export default function BookingPage() {
  return <BookingFlow />;
}

function BookingFlow() {
  const router = useRouter();
  const createOrderMutation = useCreateOrder();

  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>(
    'online',
  );
  const [note, setNote] = useState<string>('');
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');
  const [voucherCodeError, setVoucherCodeError] = useState<string>('');

  // Add vehicle modal/form in step 1
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicleData, setNewVehicleData] = useState({
    vehicleTypeId: '',
    licensePlate: '',
    nickname: '',
    brand: '',
    model: '',
    color: '',
  });
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  const fetchVehiclesAndTypes = useCallback(async () => {
    try {
      const [vehiclesRes, typesRes] = await Promise.all([
        getMyVehicles(),
        getActiveVehicleTypes(),
      ]);
      const vData = vehiclesRes.data?.data || vehiclesRes.data || [];
      const tData = typesRes.data?.data || typesRes.data || [];
      setVehicles(vData);
      setVehicleTypes(tData);

      // Pre-select default vehicle
      const defaultVehicle = vData.find((v: Vehicle) => v.isDefault);
      if (defaultVehicle) {
        setSelectedVehicleId(defaultVehicle._id || defaultVehicle.id || '');
      } else if (vData.length > 0) {
        setSelectedVehicleId(vData[0]._id || vData[0].id || '');
      }

      if (tData.length > 0) {
        setNewVehicleData((prev) =>
          prev.vehicleTypeId
            ? prev
            : { ...prev, vehicleTypeId: tData[0]._id || tData[0].id || '' },
        );
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu phương tiện:', error);
      toast.error('Không thể tải danh sách xe. Vui lòng tải lại trang.');
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  // Fetch initial data for Step 1
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [vehiclesRes, typesRes] = await Promise.all([
          getMyVehicles(),
          getActiveVehicleTypes(),
        ]);
        if (!active) return;
        const vData = vehiclesRes.data?.data || vehiclesRes.data || [];
        const tData = typesRes.data?.data || typesRes.data || [];
        setVehicles(vData);
        setVehicleTypes(tData);

        const defaultVehicle = vData.find((v: Vehicle) => v.isDefault);
        if (defaultVehicle) {
          setSelectedVehicleId(defaultVehicle._id || defaultVehicle.id || '');
        } else if (vData.length > 0) {
          setSelectedVehicleId(vData[0]._id || vData[0].id || '');
        }

        if (tData.length > 0) {
          setNewVehicleData((prev) =>
            prev.vehicleTypeId
              ? prev
              : { ...prev, vehicleTypeId: tData[0]._id || tData[0].id || '' },
          );
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu phương tiện:', error);
        toast.error('Không thể tải danh sách xe. Vui lòng tải lại trang.');
      } finally {
        if (active) setIsLoadingVehicles(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Pre-select today or tomorrow as date when step 3 starts
  const goToStep3 = () => {
    if (!selectedDate) {
      setSelectedDate(toLocalDateKey(new Date()));
    }
    setStep(3);
  };

  // Date range for picking (Next 7 days)
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const current = new Date(today);
      current.setDate(today.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;

      let label = current.toLocaleDateString('vi-VN', { weekday: 'long' });
      // Capitalize first letter
      label = label.charAt(0).toUpperCase() + label.slice(1);
      if (isToday) label = 'Hôm nay';
      if (isTomorrow) label = 'Ngày mai';

      dates.push({
        value: toLocalDateKey(current),
        label,
        day: String(current.getDate()).padStart(2, '0'),
        month: current.getMonth() + 1,
      });
    }
    return dates;
  }, []);

  // Fetch slots based on service type, vehicle type & selected date
  const slotQueryParams = useMemo(() => {
    const vehicle = vehicles.find((v) => (v._id || v.id) === selectedVehicleId);
    const vehicleTypeId = vehicle?.vehicleTypeId || '';
    if (!selectedServiceId || !vehicleTypeId || !selectedDate) {
      return {
        serviceTypeId: '',
        vehicleTypeId: '',
        from: '',
        to: '',
        enabled: false,
      };
    }
    // API available-slots expects from & to as ISO (UTC) string.
    // Lấy đúng biên ngày theo GIỜ ĐỊA PHƯƠNG rồi đổi sang UTC, tránh lệch múi giờ:
    // chuỗi 'YYYY-MM-DDTHH:mm:ss' (không có 'Z') được hiểu là giờ local.
    const fromStr = new Date(`${selectedDate}T00:00:00`).toISOString();
    const toStr = new Date(`${selectedDate}T23:59:59.999`).toISOString();
    return {
      serviceTypeId: selectedServiceId,
      vehicleTypeId,
      from: fromStr,
      to: toStr,
      enabled: step === 3,
    };
  }, [selectedServiceId, selectedVehicleId, vehicles, selectedDate, step]);

  const { data: availableSlots = [], isLoading: isLoadingSlots } =
    useAvailableSlots(slotQueryParams);

  // Realtime: slot thay đổi khi có đơn khác vừa đặt/hủy/dời HOẶC khi manager
  // tạo/hủy ca làm việc (BE bắn chung event `slots:changed`) → tải lại lưới
  // giờ đang xem để khách không chọn nhầm khung đã kín/đã đóng.
  const qc = useQueryClient();
  useSocketEvent('slots:changed', () => {
    void qc.invalidateQueries({ queryKey: ['available-slots'] });
    // Đơn của chính khách này cũng có thể vừa đổi ở tab/thiết bị khác → tải lại
    // để lưới giờ khoá đúng khung đã trùng lịch xe và hạn mức đơn khớp thực tế.
    void qc.invalidateQueries({ queryKey: ['my-orders'] });
  });

  // Active Service Types
  const { data: serviceTypes = [], isLoading: isLoadingServices } =
    useActiveServiceTypes();

  // ─── Hạn mức đơn đang hoạt động ───
  // BE từ chối đơn thứ 4 bằng 400 ở bước tạo đơn (sau khi khách đã chọn xong
  // xe/gói/giờ/thanh toán). Biết trước từ danh sách đơn nên báo ngay khi vào
  // trang, và chặn không cho đi tiếp cho khỏi mất công.
  const { data: myOrders = [], isLoading: isLoadingMyOrders } = useMyOrders();
  const activeOrders = useMemo(
    () => getActiveOrders(myOrders as Order[]),
    [myOrders],
  );
  const isAtActiveOrderLimit =
    !isLoadingMyOrders && activeOrders.length >= MAX_ACTIVE_ORDERS;
  const activeLimitMessage = activeOrderLimitMessage();

  const limitToastShown = useRef(false);
  useEffect(() => {
    if (!isAtActiveOrderLimit || limitToastShown.current) return;
    limitToastShown.current = true;
    const { title, description } = activeOrderLimitMessage();
    toast.error(title, {
      id: 'active-order-limit',
      description,
      duration: 8000,
    });
  }, [isAtActiveOrderLimit]);

  // Selected details helpers
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => (v._id || v.id) === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const selectedService = useMemo(() => {
    return serviceTypes.find(
      (s: ServiceTypeItem) => (s._id || s.id) === selectedServiceId,
    );
  }, [serviceTypes, selectedServiceId]);

  // Bảng giá của một dịch vụ cho loại xe đang chọn (BE: vehiclePricing).
  // Là nguồn dữ liệu THẬT để biết dịch vụ có áp dụng cho loại xe này không.
  const getVehiclePricing = useCallback(
    (service: ServiceTypeItem) => {
      const vtId = selectedVehicle?.vehicleTypeId;
      if (!vtId) return undefined;
      return service.vehiclePricing?.find(
        (p) => p.vehicleTypeId === vtId && p.isActive !== false,
      );
    },
    [selectedVehicle],
  );

  // ─── Tiến độ voucher thưởng ───
  // Mốc số lượt rửa giờ do BE quyết định theo hạng thành viên
  // (`washesRequiredForNextVoucher`); 10 chỉ là dự phòng khi chưa tải xong.
  const { data: myLoyalty } = useMyLoyalty();
  const washesPerVoucher = myLoyalty?.washesRequiredForNextVoucher ?? 10;
  const towardVoucher = myLoyalty?.successfulWashesTowardVoucher ?? 0;
  const washesToVoucher =
    myLoyalty?.washesRemainingForNextVoucher ??
    Math.max(washesPerVoucher - towardVoucher, 0);

  // ─── Voucher & xem trước giá ───
  const { data: myVouchers = [] } = useVouchers('unused');
  // BE đã lọc status=unused và cron tự đẩy voucher hết hạn sang EXPIRED.
  // Ở đây lọc thêm hai lớp cho khỏi mời khách chọn voucher chắc chắn hỏng:
  //  - `isVoucherUsable`: bỏ voucher đã quá hạn mà cron chưa quét tới.
  //  - `isVoucherApplicableTo`: bỏ voucher mà chiến dịch giới hạn dịch vụ/loại xe
  //    khác với lựa chọn hiện tại (mảng RỖNG = không giới hạn).
  // Phán quyết cuối vẫn của BE: preview/create trả `voucherError` khi từ chối.
  const validVouchers = useMemo(
    () =>
      (myVouchers as Voucher[]).filter(
        (v) =>
          isVoucherUsable(v) &&
          isVoucherApplicableTo(v, {
            serviceTypeId: selectedServiceId || undefined,
            vehicleTypeId: selectedVehicle?.vehicleTypeId || undefined,
          }),
      ),
    [myVouchers, selectedServiceId, selectedVehicle],
  );

  const serviceVoucherEligible = selectedService
    ? (selectedService as ServiceTypeItem).isVoucherEligible !== false
    : true;

  // ─── Chặn trước khung giờ trùng lịch của cùng chiếc xe ───
  // BE từ chối bằng 409 khi xe đã có lịch rửa chồng lấn giờ vừa chọn. Thời lượng
  // lấy theo bảng giá của loại xe (nguồn dữ liệu thật), fallback về thời lượng
  // chung của dịch vụ rồi tới một bước lưới slot.
  const selectedServiceMinutes = useMemo(() => {
    if (!selectedService) return SLOT_STEP_MINUTES;
    const minutes =
      getVehiclePricing(selectedService)?.estimatedMinutes ??
      selectedService.estimatedMinutes;
    return Number(minutes) || SLOT_STEP_MINUTES;
  }, [selectedService, getVehiclePricing]);

  // Đơn cũ của xe có thể thuộc dịch vụ khác → tra thời lượng theo dịch vụ của
  // chính đơn đó, vì cùng một xe nên vẫn dùng được bảng giá theo loại xe này.
  const orderMinutes = useCallback(
    (order: Order) => {
      if (order.estimatedMinutes) return order.estimatedMinutes;
      const service = serviceTypes.find(
        (s: ServiceTypeItem) => (s._id || s.id) === order.serviceTypeId,
      );
      if (!service) return SLOT_STEP_MINUTES;
      const minutes =
        getVehiclePricing(service)?.estimatedMinutes ?? service.estimatedMinutes;
      return Number(minutes) || SLOT_STEP_MINUTES;
    },
    [serviceTypes, getVehiclePricing],
  );

  const vehicleBusyRanges = useMemo(
    () =>
      getVehicleBusyRanges(myOrders as Order[], {
        vehicleId: selectedVehicleId,
        minutesOf: orderMinutes,
      }),
    [myOrders, selectedVehicleId, orderMinutes],
  );

  const hasBusySlot = useMemo(
    () =>
      vehicleBusyRanges.length > 0 &&
      availableSlots.some((slot: AvailableSlot) =>
        findVehicleBusyConflict(
          slot.scheduledAt,
          selectedServiceMinutes,
          vehicleBusyRanges,
        ),
      ),
    [availableSlots, selectedServiceMinutes, vehicleBusyRanges],
  );

  // Giờ đang chọn có thể thành trùng sau khi khách đổi xe/gói hoặc khi xe đó vừa
  // có đơn mới (realtime). Suy ra thay vì reset state trong effect: lựa chọn
  // trùng lịch coi như CHƯA chọn, nên không gửi được request chắc chắn bị 409.
  const selectedSlotConflict = useMemo(
    () =>
      selectedSlot
        ? findVehicleBusyConflict(
            selectedSlot,
            selectedServiceMinutes,
            vehicleBusyRanges,
          )
        : undefined,
    [selectedSlot, selectedServiceMinutes, vehicleBusyRanges],
  );
  const effectiveSlot = selectedSlotConflict ? '' : selectedSlot;

  const { data: preview } = usePreviewOrder({
    serviceTypeId: selectedServiceId,
    vehicleTypeId: selectedVehicle?.vehicleTypeId || '',
    scheduledAt: effectiveSlot,
    voucherId: selectedVoucherId || undefined,
    enabled:
      step === 4 &&
      !!selectedServiceId &&
      !!selectedVehicle?.vehicleTypeId &&
      !!effectiveSlot,
  });

  const isFreeOrder = preview?.amount === 0;
  // Đơn 0đ buộc thanh toán tiền mặt - BE từ chối online khi total = 0.
  const effectivePaymentMethod: 'online' | 'cash' = isFreeOrder
    ? 'cash'
    : paymentMethod;

  // Chỉ hiện các dịch vụ có cấu hình giá cho loại xe đã chọn — khớp đúng với
  // điều BE chấp nhận, tránh khách chọn combo bị từ chối (400).
  const filteredServiceTypes = useMemo(() => {
    const vtId = selectedVehicle?.vehicleTypeId;
    if (!vtId) return serviceTypes;
    return serviceTypes.filter((service: ServiceTypeItem) =>
      service.vehiclePricing?.some(
        (p) => p.vehicleTypeId === vtId && p.isActive !== false,
      ),
    );
  }, [serviceTypes, selectedVehicle]);

  // Handle Quick Add Vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleData.licensePlate.trim()) {
      toast.warning('Vui lòng nhập biển số xe');
      return;
    }
    setIsSavingVehicle(true);
    try {
      const res = await createVehicle({
        vehicleTypeId: newVehicleData.vehicleTypeId,
        licensePlate: newVehicleData.licensePlate.trim().toUpperCase(),
        nickname: newVehicleData.nickname.trim() || undefined,
        brand: newVehicleData.brand.trim() || undefined,
        model: newVehicleData.model.trim() || undefined,
        color: newVehicleData.color.trim() || undefined,
        isDefault: vehicles.length === 0,
      });
      toast.success('Đã thêm xe mới thành công!');
      const addedVehicle = res.data;

      // Refresh vehicles and select the newly added one
      await fetchVehiclesAndTypes();
      if (addedVehicle) {
        setSelectedVehicleId(addedVehicle._id || addedVehicle.id || '');
      }
      setIsAddingVehicle(false);
    } catch (error) {
      console.error('Lỗi khi thêm xe nhanh:', error);
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || 'Có lỗi xảy ra khi thêm xe',
      );
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // Submit flow
  const handleSubmitBooking = async () => {
    if (selectedSlotConflict) {
      toast.error('Xe này đã có lịch rửa trùng với khung giờ bạn chọn.', {
        description: 'Vui lòng chọn khung giờ khác hoặc hủy lịch cũ.',
      });
      setStep(3);
      return;
    }

    if (!selectedVehicleId || !selectedServiceId || !effectiveSlot) {
      toast.error('Vui lòng hoàn tất đầy đủ các bước trước khi đặt!');
      return;
    }

    if (isAtActiveOrderLimit) {
      toast.error(activeLimitMessage.title, {
        id: 'active-order-limit',
        description: activeLimitMessage.description,
      });
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        vehicleId: selectedVehicleId,
        serviceTypeId: selectedServiceId,
        scheduledAt: effectiveSlot,
        paymentMethod: effectivePaymentMethod,
        note: note.trim() || undefined,
        voucherId: selectedVoucherId || undefined,
      });

      toast.success('Đặt lịch thành công!');

      if (effectivePaymentMethod === 'online' && order.payosCheckoutUrl) {
        toast.info('Đang chuyển hướng đến cổng thanh toán PayOS...');
        // Chuyển hướng đến cổng thanh toán
        window.location.href = order.payosCheckoutUrl;
      } else {
        // Trực tiếp đưa về trang đơn hàng
        router.push('/profile/orders?success=true');
      }
    } catch (error) {
      console.error('Lỗi đặt lịch:', error);
      // Hai lỗi nghiệp vụ FE đã chặn trước nhưng BE vẫn có thể trả (đơn vừa được
      // đặt ở tab khác, slot vừa bị người khác lấy): làm mới dữ liệu để lưới giờ
      // và hạn mức khớp lại thực tế.
      const limitReached = getActiveOrderLimitReached(error);
      if (limitReached !== null) {
        void qc.invalidateQueries({ queryKey: ['my-orders'] });
        const { title, description } = activeOrderLimitMessage(limitReached);
        toast.error(title, { id: 'active-order-limit', description });
        return;
      }
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
      void qc.invalidateQueries({ queryKey: ['available-slots'] });
      toast.error('Đặt lịch thất bại.', {
        description: getErrorMessage(error),
      });
    }
  };

  // UI rendering of steps indicator
  const renderStepsIndicator = () => {
    const steps = [
      { num: 1, title: 'Chọn xe' },
      { num: 2, title: 'Chọn gói' },
      { num: 3, title: 'Chọn thời gian' },
      { num: 4, title: 'Xác nhận' },
    ];
    return (
      <div className='mb-8'>
        <div className='flex items-center justify-between max-w-xl mx-auto px-4'>
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className='flex items-center flex-1 last:flex-initial'
            >
              <button
                onClick={() => step > s.num && setStep(s.num)}
                disabled={step <= s.num}
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                      ? 'border border-primary/40 bg-accent text-primary hover:bg-primary/10'
                      : 'border border-border bg-card text-placeholder',
                )}
              >
                {step > s.num ? <Check className='w-3.5 h-3.5' /> : s.num}
              </button>
              <span
                className={cn(
                  'hidden sm:inline text-xs ml-2',
                  step === s.num
                    ? 'font-semibold text-foreground'
                    : step > s.num
                      ? 'font-medium text-muted-foreground'
                      : 'font-medium text-placeholder',
                )}
              >
                {s.title}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-3',
                    step > s.num ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className='sm:hidden text-center text-xs font-medium text-muted-foreground mt-2'>
          Bước {step}/4 · {steps[step - 1].title}
        </p>
      </div>
    );
  };

  // Tiêu đề mỗi bước: eyebrow "Bước N/4" + tên bước, dùng chung cho cả 4 bước.
  const renderStepTitle = (num: number, title: string) => (
    <div>
      <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>
        Bước {num}/4
      </p>
      <h2 className='font-heading text-lg font-semibold tracking-tight text-foreground mt-0.5'>
        {title}
      </h2>
    </div>
  );

  // Biển số vẽ như vật thể thật: nền trắng cả ở dark mode, chữ mono đen.
  const renderLicensePlate = (plate: string) => {
    return (
      <div className='inline-flex flex-col items-center justify-center rounded border-[1.5px] border-slate-500 bg-white px-2.5 py-1 font-mono'>
        <div className='text-[8px] tracking-[0.2em] text-slate-500 font-sans leading-none'>
          VIỆT NAM
        </div>
        <span className='text-xs font-bold text-slate-900 tracking-wider pt-0.5 leading-none'>
          {plate}
        </span>
      </div>
    );
  };

  return (
    <div className='min-h-screen bg-background pt-8 pb-12'>
      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Banner header */}
        <div className='relative mb-6 flex items-center justify-between'>
          <Button
            variant='ghost'
            onClick={() => router.push('/')}
            className='text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer px-3 shrink-0'
          >
            <ChevronLeft className='w-4 h-4' />
            <span className='hidden sm:inline'>Về trang chủ</span>
          </Button>
          <div className='text-center'>
            <h1 className='font-heading text-xl sm:text-2xl font-semibold text-foreground tracking-tight'>
              Đặt lịch rửa xe
            </h1>
            <p className='hidden text-muted-foreground text-[13px] sm:block'>
              Hoàn tất 4 bước để đặt lịch và thanh toán
            </p>
          </div>
          {/* Spacer cân đối với nút Về trang chủ để tiêu đề căn giữa */}
          <div
            className='w-9 shrink-0 sm:w-29'
            aria-hidden
          />
        </div>

        {/* Steps navigation */}
        {renderStepsIndicator()}

        {/* Hết hạn mức đơn đang hoạt động — báo ngay đầu luồng, không để khách
            chọn xong mọi thứ rồi mới bị BE từ chối ở bước tạo đơn. */}
        {isAtActiveOrderLimit && (
          <div className='mb-6 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center'>
            <AlertCircle className='w-5 h-5 shrink-0 text-warning' />
            <div className='flex-1 space-y-0.5'>
              <p className='text-sm font-semibold text-foreground'>
                {activeLimitMessage.title}
              </p>
              <p className='text-xs text-muted-foreground'>
                {activeLimitMessage.description}
              </p>
            </div>
            <Button
              variant='outline'
              onClick={() => router.push('/profile/orders')}
              className='shrink-0 cursor-pointer text-xs font-semibold'
            >
              Xem lịch hẹn của tôi
            </Button>
          </div>
        )}

        {/* Main Step Wrapper */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'>
          {/* Step content */}
          <div className='lg:col-span-2 space-y-6'>
            <Card className='border border-border shadow-xs rounded-xl overflow-hidden bg-card'>
              <CardContent className='p-5 sm:p-6'>
                {/* ──────── STEP 1: CHỌN XE ──────── */}
                {step === 1 && (
                  <div className='space-y-6'>
                    <div className='flex justify-between items-end mb-4'>
                      {renderStepTitle(1, 'Chọn xe của bạn')}
                      {!isAddingVehicle && (
                        <Button
                          type='button'
                          variant='ghost'
                          onClick={() => setIsAddingVehicle(true)}
                          className='text-xs text-primary font-semibold flex items-center gap-1 hover:bg-accent rounded-lg px-2.5 py-1.5 cursor-pointer'
                        >
                          <Plus className='w-3.5 h-3.5' /> Thêm xe
                        </Button>
                      )}
                    </div>

                    {isAddingVehicle ? (
                      <Card className='border border-border bg-muted/40 rounded-xl overflow-hidden p-6 motion-safe:animate-in motion-safe:slide-in-from-top-4 duration-300'>
                        <form
                          onSubmit={handleAddVehicle}
                          className='space-y-4'
                        >
                          <div className='flex items-center justify-between border-b border-border pb-3 mb-4'>
                            <span className='font-semibold text-foreground text-sm'>
                              Thêm phương tiện mới
                            </span>
                            <button
                              type='button'
                              onClick={() => setIsAddingVehicle(false)}
                              className='text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer'
                            >
                              Hủy
                            </button>
                          </div>

                          <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-1.5'>
                              <Label className='text-xs font-medium text-muted-foreground'>
                                Biển số *
                              </Label>
                              <Input
                                required
                                placeholder='51A-12345'
                                value={newVehicleData.licensePlate}
                                onChange={(e) =>
                                  setNewVehicleData({
                                    ...newVehicleData,
                                    licensePlate: e.target.value,
                                  })
                                }
                                className='bg-background uppercase font-mono font-semibold'
                              />
                            </div>
                            <div className='space-y-1.5'>
                              <Label className='text-xs font-medium text-muted-foreground'>
                                Loại xe *
                              </Label>
                              <select
                                value={newVehicleData.vehicleTypeId}
                                onChange={(e) =>
                                  setNewVehicleData({
                                    ...newVehicleData,
                                    vehicleTypeId: e.target.value,
                                  })
                                }
                                className='w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm'
                              >
                                {vehicleTypes.map((t) => (
                                  <option
                                    key={t._id || t.id}
                                    value={t._id || t.id}
                                  >
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className='space-y-1.5'>
                            <Label className='text-xs font-medium text-muted-foreground'>
                              Biệt danh / tên gọi
                            </Label>
                            <Input
                              placeholder='Xe đi làm, xe ga...'
                              value={newVehicleData.nickname}
                              onChange={(e) =>
                                setNewVehicleData({
                                  ...newVehicleData,
                                  nickname: e.target.value,
                                })
                              }
                              className='bg-background'
                            />
                          </div>

                          <div className='grid grid-cols-3 gap-3'>
                            <div className='space-y-1.5'>
                              <Label className='text-xs font-medium text-muted-foreground'>
                                Hãng xe
                              </Label>
                              <Input
                                placeholder='Honda...'
                                value={newVehicleData.brand}
                                onChange={(e) =>
                                  setNewVehicleData({
                                    ...newVehicleData,
                                    brand: e.target.value,
                                  })
                                }
                                className='bg-background text-xs h-9'
                              />
                            </div>
                            <div className='space-y-1.5'>
                              <Label className='text-xs font-medium text-muted-foreground'>
                                Dòng xe
                              </Label>
                              <Input
                                placeholder='Wave...'
                                value={newVehicleData.model}
                                onChange={(e) =>
                                  setNewVehicleData({
                                    ...newVehicleData,
                                    model: e.target.value,
                                  })
                                }
                                className='bg-background text-xs h-9'
                              />
                            </div>
                            <div className='space-y-1.5'>
                              <Label className='text-xs font-medium text-muted-foreground'>
                                Màu sắc
                              </Label>
                              <Input
                                placeholder='Đen...'
                                value={newVehicleData.color}
                                onChange={(e) =>
                                  setNewVehicleData({
                                    ...newVehicleData,
                                    color: e.target.value,
                                  })
                                }
                                className='bg-background text-xs h-9'
                              />
                            </div>
                          </div>

                          <div className='flex justify-end gap-2 pt-2'>
                            <Button
                              type='button'
                              variant='outline'
                              onClick={() => setIsAddingVehicle(false)}
                              className='text-xs h-9 px-4 cursor-pointer'
                              disabled={isSavingVehicle}
                            >
                              Quay lại
                            </Button>
                            <Button
                              type='submit'
                              className='text-xs h-9 px-5 cursor-pointer'
                              disabled={isSavingVehicle}
                            >
                              {isSavingVehicle ? (
                                <Spinner className='size-4' />
                              ) : (
                                'Lưu và chọn'
                              )}
                            </Button>
                          </div>
                        </form>
                      </Card>
                    ) : isLoadingVehicles ? (
                      <div className='flex flex-col items-center justify-center py-10 gap-3'>
                        <Spinner className='size-8 text-primary' />
                        <span className='text-xs text-muted-foreground'>
                          Đang tải danh sách xe...
                        </span>
                      </div>
                    ) : vehicles.length === 0 ? (
                      <div className='text-center py-10 border border-dashed border-border rounded-xl bg-muted/30 p-6'>
                        <Car className='w-12 h-12 text-placeholder mx-auto mb-3' />
                        <p className='text-sm font-semibold text-foreground mb-1'>
                          Chưa có xe nào trong garage của bạn
                        </p>
                        <p className='text-xs text-muted-foreground mb-4'>
                          Thêm thông tin xe để tiếp tục đặt lịch rửa xe.
                        </p>
                        <Button
                          onClick={() => setIsAddingVehicle(true)}
                          className='text-xs font-semibold px-4 cursor-pointer'
                        >
                          Thêm xe ngay
                        </Button>
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        {vehicles.map((v) => {
                          const isSelected =
                            (v._id || v.id) === selectedVehicleId;
                          const foundType = vehicleTypes.find(
                            (t) => (t._id || t.id) === v.vehicleTypeId,
                          );
                          const isMotor =
                            foundType?.name.toLowerCase().includes('motor') ||
                            foundType?.name.toLowerCase().includes('xe máy');

                          return (
                            <button
                              key={v._id || v.id}
                              onClick={() =>
                                setSelectedVehicleId(v._id || v.id || '')
                              }
                              className={cn(
                                'text-left p-4 rounded-lg border transition-colors flex flex-col justify-between min-h-[120px] cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                isSelected
                                  ? 'border-primary bg-accent ring-1 ring-primary'
                                  : 'border-border bg-card hover:border-primary/40',
                              )}
                            >
                              <div className='flex justify-between items-start w-full'>
                                <div className='flex items-center gap-2'>
                                  <div
                                    className={cn(
                                      'p-1.5 rounded-md text-xs',
                                      isSelected
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-muted text-muted-foreground',
                                    )}
                                  >
                                    {isMotor ? (
                                      <Bike className='w-4 h-4' />
                                    ) : (
                                      <Car className='w-4 h-4' />
                                    )}
                                  </div>
                                  <div>
                                    <span className='font-semibold text-sm block leading-tight text-foreground truncate max-w-[120px]'>
                                      {v.nickname || v.brand || 'Phương tiện'}
                                    </span>
                                    <span className='text-[11px] text-muted-foreground block'>
                                      {foundType?.name || 'Chưa rõ loại'}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className='absolute top-3 right-3 bg-primary text-primary-foreground p-0.5 rounded-full'>
                                    <Check className='w-3.5 h-3.5' />
                                  </span>
                                )}
                              </div>

                              <div className='mt-4 flex items-center justify-between w-full'>
                                {renderLicensePlate(v.licensePlate)}
                                <span className='text-[11px] text-muted-foreground'>
                                  {v.color || ''}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className='flex justify-end pt-4 border-t border-border'>
                      <Button
                        disabled={!selectedVehicleId || isAtActiveOrderLimit}
                        onClick={() => setStep(2)}
                        className='px-6 cursor-pointer flex items-center gap-1.5'
                      >
                        Tiếp theo <ChevronRight className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ──────── STEP 2: CHỌN GÓI DỊCH VỤ ──────── */}
                {step === 2 && (
                  <div className='space-y-6'>
                    <div className='mb-4'>
                      {renderStepTitle(2, 'Chọn gói dịch vụ')}
                    </div>

                    {isLoadingServices ? (
                      <div className='flex flex-col items-center justify-center py-10 gap-3'>
                        <Spinner className='size-8 text-primary' />
                        <span className='text-xs text-muted-foreground'>
                          Đang tải danh sách gói rửa xe...
                        </span>
                      </div>
                    ) : filteredServiceTypes.length === 0 ? (
                      <p className='text-center py-10 text-muted-foreground text-sm'>
                        Chưa có dịch vụ nào phù hợp với loại xe này.
                      </p>
                    ) : (
                      <div className='space-y-4'>
                        {filteredServiceTypes.map(
                          (service: ServiceTypeItem) => {
                            const isSelected =
                              (service._id || service.id) === selectedServiceId;
                            const pricing = getVehiclePricing(service);
                            const displayPrice = Number(
                              pricing?.price ?? service.basePrice,
                            );
                            const displayMinutes =
                              pricing?.estimatedMinutes ??
                              service.estimatedMinutes;
                            return (
                              <button
                                key={service._id || service.id}
                                onClick={() => {
                                  setSelectedServiceId(
                                    service._id || service.id || '',
                                  );
                                  setSelectedVoucherId('');
                                }}
                                className={cn(
                                  'w-full text-left p-5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  isSelected
                                    ? 'border-primary bg-accent ring-1 ring-primary'
                                    : 'border-border bg-card hover:border-primary/40',
                                )}
                              >
                                <div className='flex-1 space-y-1 max-w-md'>
                                  <div className='flex items-center gap-2.5'>
                                    <span className='font-heading font-semibold text-base text-foreground tracking-tight'>
                                      {service.name}
                                    </span>
                                    {service.pointsMultiplier > 1 && (
                                      <span className='text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full'>
                                        Tích điểm ×{service.pointsMultiplier}
                                      </span>
                                    )}
                                  </div>
                                  <p className='text-xs text-muted-foreground leading-relaxed'>
                                    {service.description ||
                                      'Dịch vụ chuyên nghiệp toàn diện cho chiếc xe của bạn'}
                                  </p>

                                  {/* Checklist preview */}
                                  {service.checklistTemplate &&
                                    service.checklistTemplate.length > 0 && (
                                      <div className='flex flex-wrap gap-x-3 gap-y-1 pt-2'>
                                        {service.checklistTemplate
                                          .slice(0, 3)
                                          .map((item: string, i: number) => (
                                            <span
                                              key={i}
                                              className='text-[11px] text-muted-foreground flex items-center gap-1'
                                            >
                                              <Check className='w-3 h-3 text-primary' />{' '}
                                              {item}
                                            </span>
                                          ))}
                                        {service.checklistTemplate.length >
                                          3 && (
                                          <span className='text-[11px] text-muted-foreground font-medium'>
                                            +
                                            {service.checklistTemplate.length -
                                              3}{' '}
                                            bước khác
                                          </span>
                                        )}
                                      </div>
                                    )}
                                </div>

                                <div className='flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-border sm:pl-6 pt-3 sm:pt-0 shrink-0'>
                                  <span className='font-semibold text-lg text-foreground tabular-nums'>
                                    {formatCurrency(displayPrice)}
                                  </span>
                                  <span className='text-[11px] text-muted-foreground'>
                                    khoảng {displayMinutes} phút
                                  </span>
                                </div>

                                {isSelected && (
                                  <span className='absolute top-3 right-3 bg-primary text-primary-foreground p-0.5 rounded-full'>
                                    <Check className='w-3.5 h-3.5' />
                                  </span>
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}

                    <div className='flex justify-between pt-6 border-t border-border'>
                      <Button
                        variant='outline'
                        onClick={() => setStep(1)}
                        className='px-6 cursor-pointer flex items-center gap-1.5'
                      >
                        <ChevronLeft className='w-4 h-4' /> Quay lại
                      </Button>
                      <Button
                        disabled={!selectedServiceId}
                        onClick={goToStep3}
                        className='px-6 cursor-pointer flex items-center gap-1.5'
                      >
                        Tiếp theo <ChevronRight className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ──────── STEP 3: CHỌN NGÀY & GIỜ TRỐNG ──────── */}
                {step === 3 && (
                  <div className='space-y-6'>
                    <div className='mb-4'>
                      {renderStepTitle(3, 'Chọn ngày và giờ rửa xe')}
                    </div>

                    {/* Date Horizontal Picker */}
                    <div className='space-y-2'>
                      <Label className='text-xs font-medium text-muted-foreground block'>
                        Ngày rửa xe
                      </Label>
                      <div className='flex gap-2.5 overflow-x-auto pb-2 scrollbar-none'>
                        {dateOptions.map((d) => {
                          const isSelected = d.value === selectedDate;
                          return (
                            <button
                              key={d.value}
                              type='button'
                              onClick={() => {
                                setSelectedDate(d.value);
                                setSelectedSlot(''); // reset slot khi đổi ngày
                              }}
                              className={cn(
                                'flex flex-col items-center justify-center p-3 rounded-lg border transition-colors min-w-[85px] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                isSelected
                                  ? 'border-primary bg-accent ring-1 ring-primary'
                                  : 'border-border bg-card hover:border-primary/40',
                              )}
                            >
                              <span
                                className={cn(
                                  'text-[10px] font-semibold uppercase tracking-[0.08em]',
                                  isSelected
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {d.label}
                              </span>
                              <span className='text-lg font-semibold text-foreground mt-0.5 tracking-tight tabular-nums'>
                                {d.day}
                              </span>
                              <span className='text-[10px] text-muted-foreground'>
                                Thg {d.month}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Available Slots Grid */}
                    <div className='space-y-3 pt-2'>
                      <div className='flex justify-between items-center'>
                        <Label className='text-xs font-medium text-muted-foreground'>
                          Giờ còn trống
                        </Label>
                        <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                          <Clock className='w-3.5 h-3.5' /> Các khung giờ cách
                          nhau 30 phút
                        </span>
                      </div>

                      {isLoadingSlots ? (
                        <div className='flex flex-col items-center justify-center py-10 gap-3'>
                          <Spinner className='size-8 text-primary' />
                          <span className='text-xs text-muted-foreground'>
                            Đang tìm kiếm ca trống phù hợp...
                          </span>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className='border border-dashed border-border bg-muted/30 rounded-xl p-6 text-center'>
                          <div className='flex flex-col items-center justify-center gap-2'>
                            <Calendar className='w-8 h-8 text-placeholder' />
                            <p className='text-sm font-semibold text-foreground'>
                              Ngày này chưa có giờ trống
                            </p>
                            <p className='text-xs text-muted-foreground max-w-sm'>
                              Các ca đã kín lịch hoặc chưa có ca trực. Chọn ngày
                              khác để xem thêm giờ trống.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className='flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground'>
                            <Sparkles className='w-3.5 h-3.5 shrink-0 text-warning' />
                            Ô viền vàng là giờ vàng — đặt khung này được giảm
                            giá theo hạng thành viên.
                          </div>
                          {hasBusySlot && (
                            <div className='flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground'>
                              <AlertCircle className='w-3.5 h-3.5 shrink-0 text-muted-foreground' />
                              Ô ghi &quot;Trùng lịch&quot; là giờ xe này đã có
                              lịch rửa khác — chọn giờ khác hoặc hủy lịch cũ.
                            </div>
                          )}
                          {/* Giờ đang chọn vừa thành trùng (đổi xe/gói hoặc xe
                              vừa có đơn mới) → nói rõ vì sao mất lựa chọn. */}
                          {selectedSlotConflict && (
                            <div className='flex items-center gap-1.5 mb-3 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-[11px] text-foreground'>
                              <AlertCircle className='w-3.5 h-3.5 shrink-0 text-warning' />
                              Khung giờ bạn chọn đã trùng lịch rửa lúc{' '}
                              {new Date(
                                selectedSlotConflict.order.scheduledAt,
                              ).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}{' '}
                              của xe này. Vui lòng chọn khung giờ khác.
                            </div>
                          )}
                          <div className='grid grid-cols-3 sm:grid-cols-4 gap-3'>
                            {availableSlots.map((slot: AvailableSlot) => {
                              const isSelected =
                                slot.scheduledAt === effectiveSlot;
                              const isFull = slot.remainingCapacity <= 0;
                              // Xe này đã có lịch rửa chồng lấn khung giờ →
                              // BE sẽ trả 409, disable trước cho khỏi mất công.
                              const isBusy =
                                !isFull &&
                                !!findVehicleBusyConflict(
                                  slot.scheduledAt,
                                  selectedServiceMinutes,
                                  vehicleBusyRanges,
                                );
                              // Dùng cờ Giờ Vàng do BE trả về (nguồn dữ liệu thật),
                              // không tự suy theo khung giờ ở FE để tránh đánh dấu sai.
                              const isGolden =
                                slot.isGoldenHour && !isFull && !isBusy;
                              const isDisabled = isFull || isBusy;
                              // Format time from ISO
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
                                  onClick={() =>
                                    setSelectedSlot(slot.scheduledAt)
                                  }
                                  className={cn(
                                    'p-3 rounded-lg border transition-colors cursor-pointer flex flex-col items-center justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    isSelected
                                      ? 'border-primary bg-accent ring-1 ring-primary'
                                      : isDisabled
                                        ? 'border-border bg-muted text-placeholder cursor-not-allowed'
                                        : isGolden
                                          ? 'border-warning/60 bg-warning/10 hover:bg-warning/20'
                                          : 'border-border bg-card hover:border-primary/40',
                                  )}
                                >
                                  {isGolden && (
                                    <span className='absolute -top-2 -right-1.5 flex items-center gap-0.5 rounded-full bg-warning text-warning-foreground text-[9px] font-semibold px-1.5 py-0.5'>
                                      <Sparkles className='w-2.5 h-2.5' />
                                      {slot.discountPercent > 0
                                        ? `-${slot.discountPercent}%`
                                        : 'Giờ vàng'}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      'font-semibold text-sm tracking-tight tabular-nums',
                                      isDisabled
                                        ? 'text-placeholder'
                                        : 'text-foreground',
                                    )}
                                  >
                                    {timeStr}
                                  </span>
                                  {/* Nút disabled có `pointer-events-none` nên
                                      tooltip `title` không hiện — ghi lý do ra ô. */}
                                  {isBusy && (
                                    <span className='text-[9px] font-semibold text-placeholder mt-0.5 leading-none'>
                                      Trùng lịch
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className='flex justify-between pt-6 border-t border-border'>
                      <Button
                        variant='outline'
                        onClick={() => setStep(2)}
                        className='px-6 cursor-pointer flex items-center gap-1.5'
                      >
                        <ChevronLeft className='w-4 h-4' /> Quay lại
                      </Button>
                      <Button
                        disabled={!effectiveSlot}
                        onClick={() => setStep(4)}
                        className='px-6 cursor-pointer flex items-center gap-1.5'
                      >
                        Tiếp theo <ChevronRight className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ──────── STEP 4: XÁC NHẬN ĐƠN HÀNG ──────── */}
                {step === 4 && (
                  <div className='space-y-6'>
                    <div className='mb-4'>
                      {renderStepTitle(4, 'Thanh toán và xác nhận')}
                    </div>

                    {/* Voucher - mức ưu đãi do chiến dịch của từng voucher quyết định */}
                    {validVouchers.length > 0 && (
                      <div className='space-y-3'>
                        <Label className='text-xs font-medium text-muted-foreground block'>
                          Voucher của bạn ({validVouchers.length})
                        </Label>

                        {!serviceVoucherEligible ? (
                          <div className='flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
                            <AlertCircle className='w-4 h-4 shrink-0' />
                            Gói dịch vụ này không áp dụng voucher.
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {/* Nhập mã voucher */}
                            <div className='flex gap-2'>
                              <input
                                value={voucherCodeInput}
                                onChange={(e) => {
                                  setVoucherCodeInput(
                                    e.target.value.toUpperCase(),
                                  );
                                  setVoucherCodeError('');
                                }}
                                placeholder='Nhập mã voucher…'
                                className='flex-1 min-w-0 border border-input bg-background rounded-lg px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                              />
                              <button
                                type='button'
                                onClick={() => {
                                  const q = voucherCodeInput
                                    .trim()
                                    .toUpperCase();
                                  if (!q) return;
                                  const found = validVouchers.find(
                                    (v) => v.code.toUpperCase() === q,
                                  );
                                  if (found) {
                                    setSelectedVoucherId(found.id);
                                    setVoucherCodeError('');
                                    setVoucherCodeInput('');
                                    toast.success(
                                      `Đã áp dụng voucher ${found.code} - ${voucherBenefitLabel(found)}`,
                                    );
                                  } else {
                                    // Ô này chỉ chọn trong voucher ĐÃ thuộc về
                                    // khách. Mã của lô chung phải nhận về ví
                                    // trước qua POST /me/vouchers/claim.
                                    setVoucherCodeError(
                                      'Mã không nằm trong ví của bạn. Nếu là mã khuyến mãi, hãy nhận về ví ở mục "Voucher của tôi" trước.',
                                    );
                                    toast.error(
                                      'Mã voucher không có trong ví của bạn.',
                                    );
                                  }
                                }}
                                className='px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                              >
                                Áp dụng
                              </button>
                            </div>
                            {voucherCodeError && (
                              <p className='text-[11px] text-destructive flex items-center gap-1'>
                                <AlertCircle className='w-3.5 h-3.5 shrink-0' />{' '}
                                {voucherCodeError}
                              </p>
                            )}
                            <div className='text-[11px] text-muted-foreground pt-1'>
                              Hoặc chọn từ voucher bạn đang có:
                            </div>
                            {validVouchers.map((v) => {
                              const isSelected = v.id === selectedVoucherId;
                              return (
                                <button
                                  key={v.id}
                                  type='button'
                                  onClick={() =>
                                    setSelectedVoucherId(isSelected ? '' : v.id)
                                  }
                                  className={cn(
                                    'w-full text-left p-3.5 rounded-lg border transition-colors flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    isSelected
                                      ? 'border-primary bg-accent ring-1 ring-primary'
                                      : 'border-border bg-card hover:border-primary/40',
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'p-2 rounded-md shrink-0',
                                      isSelected
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-muted text-muted-foreground',
                                    )}
                                  >
                                    <Ticket className='w-4 h-4' />
                                  </div>
                                  <div className='flex-1 min-w-0'>
                                    <span className='font-semibold text-sm text-foreground block truncate'>
                                      {voucherTitle(v)}
                                    </span>
                                    <span className='text-[11px] text-muted-foreground block truncate'>
                                      <span className='font-mono'>{v.code}</span>{' '}
                                      · {voucherBenefitLabel(v)} · HSD{' '}
                                      {new Date(v.expiresAt).toLocaleDateString(
                                        'vi-VN',
                                      )}
                                    </span>
                                    {voucherMinOrderLabel(v) && (
                                      <span className='text-[11px] text-muted-foreground block'>
                                        {voucherMinOrderLabel(v)}
                                      </span>
                                    )}
                                  </div>
                                  {isSelected ? (
                                    <Check className='w-4 h-4 text-primary shrink-0' />
                                  ) : (
                                    <span className='text-[11px] font-semibold text-primary shrink-0'>
                                      Áp dụng
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            {selectedVoucherId && (
                              <button
                                type='button'
                                onClick={() => setSelectedVoucherId('')}
                                className='text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer'
                              >
                                <X className='w-3.5 h-3.5' /> Bỏ áp dụng voucher
                              </button>
                            )}
                          </div>
                        )}

                        {preview?.voucherError && selectedVoucherId && (
                          <div className='flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive'>
                            <AlertCircle className='w-4 h-4 shrink-0' />{' '}
                            {preview.voucherError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Method Picker */}
                    <div className='space-y-3'>
                      <Label className='text-xs font-medium text-muted-foreground block'>
                        Hình thức thanh toán
                      </Label>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        {/* PayOS Online */}
                        <button
                          type='button'
                          disabled={isFreeOrder}
                          onClick={() =>
                            !isFreeOrder && setPaymentMethod('online')
                          }
                          className={cn(
                            'text-left p-4 rounded-lg border transition-colors flex items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isFreeOrder
                              ? 'border-border bg-muted opacity-60 cursor-not-allowed'
                              : effectivePaymentMethod === 'online'
                                ? 'border-primary bg-accent ring-1 ring-primary cursor-pointer'
                                : 'border-border bg-card hover:border-primary/40 cursor-pointer',
                          )}
                        >
                          <div
                            className={cn(
                              'p-2.5 rounded-md',
                              effectivePaymentMethod === 'online'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <CreditCard className='w-5 h-5' />
                          </div>
                          <div>
                            <span className='font-semibold text-sm text-foreground block leading-tight'>
                              Thanh toán online (PayOS)
                            </span>
                            <span className='text-[11px] text-muted-foreground'>
                              Quét mã QR ngân hàng
                            </span>
                          </div>
                          {effectivePaymentMethod === 'online' && (
                            <Check className='w-4 h-4 text-primary ml-auto' />
                          )}
                        </button>

                        {/* Cash */}
                        <button
                          type='button'
                          onClick={() => setPaymentMethod('cash')}
                          className={cn(
                            'text-left p-4 rounded-lg border transition-colors flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            effectivePaymentMethod === 'cash'
                              ? 'border-primary bg-accent ring-1 ring-primary'
                              : 'border-border bg-card hover:border-primary/40',
                          )}
                        >
                          <div
                            className={cn(
                              'p-2.5 rounded-md',
                              effectivePaymentMethod === 'cash'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <DollarSign className='w-5 h-5' />
                          </div>
                          <div>
                            <span className='font-semibold text-sm text-foreground block leading-tight'>
                              Tiền mặt tại quầy
                            </span>
                            <span className='text-[11px] text-muted-foreground'>
                              Thanh toán sau khi rửa xong
                            </span>
                          </div>
                          {effectivePaymentMethod === 'cash' && (
                            <Check className='w-4 h-4 text-primary ml-auto' />
                          )}
                        </button>
                      </div>
                      {isFreeOrder && (
                        <p className='text-[11px] text-muted-foreground flex items-center gap-1.5'>
                          <AlertCircle className='w-3.5 h-3.5 text-primary' />
                          Đơn được voucher giảm về 0đ — chỉ cần thanh toán tiền
                          mặt tại quầy.
                        </p>
                      )}
                    </div>

                    {/* Booking Notes */}
                    <div className='space-y-2 pt-2'>
                      <Label
                        htmlFor='booking-note'
                        className='text-xs font-medium text-muted-foreground block'
                      >
                        Ghi chú thêm (không bắt buộc)
                      </Label>
                      <Textarea
                        id='booking-note'
                        placeholder='VD: Hút bụi kỹ ghế sau, rửa sạch vết bẩn gầm xe...'
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className='bg-background text-sm resize-none h-24'
                        maxLength={500}
                      />
                    </div>

                    <div className='flex justify-between pt-6 border-t border-border'>
                      <Button
                        variant='outline'
                        onClick={() => setStep(3)}
                        className='px-6 cursor-pointer flex items-center gap-1.5'
                      >
                        <ChevronLeft className='w-4 h-4' /> Quay lại
                      </Button>
                      <Button
                        onClick={handleSubmitBooking}
                        disabled={
                          createOrderMutation.isPending || isAtActiveOrderLimit
                        }
                        className='px-7 cursor-pointer flex items-center gap-1.5'
                      >
                        {createOrderMutation.isPending ? (
                          <>
                            <Spinner className='size-4' /> Đang tạo đơn...
                          </>
                        ) : (
                          <>
                            <Check className='w-4 h-4' /> Xác nhận đặt lịch
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── SIDEBAR: PHIẾU RỬA XE (tóm tắt đơn) ─── */}
          <div className='space-y-6'>
            <div className='sticky top-6'>
              <div className='relative rounded-xl border border-border bg-card shadow-xs overflow-hidden'>
                {/* Đầu phiếu */}
                <div className='flex items-baseline justify-between px-5 pt-4 pb-3 border-b border-border'>
                  <h3 className='text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'>
                    Phiếu rửa xe
                  </h3>
                  <span className='font-heading text-sm font-bold tracking-tight text-primary'>
                    WAVE
                  </span>
                </div>

                {/* Thân phiếu */}
                <div className='px-5 py-4 space-y-3.5 text-sm'>
                  {/* Vehicle Summary */}
                  <div>
                    <span className='text-[11px] text-muted-foreground block mb-0.5'>
                      Phương tiện
                    </span>
                    {selectedVehicle ? (
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-foreground font-medium'>
                          {selectedVehicle.nickname ||
                            selectedVehicle.brand ||
                            'Xe của tôi'}
                        </span>
                        {renderLicensePlate(selectedVehicle.licensePlate)}
                      </div>
                    ) : (
                      <span className='text-placeholder'>Chưa chọn</span>
                    )}
                  </div>

                  {/* Service Summary */}
                  <div>
                    <span className='text-[11px] text-muted-foreground block mb-0.5'>
                      Dịch vụ
                    </span>
                    {selectedService ? (
                      <div className='flex items-baseline justify-between gap-2'>
                        <span className='text-foreground font-medium'>
                          {selectedService.name}
                        </span>
                        <span className='text-xs text-muted-foreground shrink-0 tabular-nums'>
                          ~{selectedService.estimatedMinutes} phút
                        </span>
                      </div>
                    ) : (
                      <span className='text-placeholder'>Chưa chọn</span>
                    )}
                  </div>

                  {/* Date & Time Summary */}
                  <div>
                    <span className='text-[11px] text-muted-foreground block mb-0.5'>
                      Thời gian hẹn
                    </span>
                    {effectiveSlot ? (
                      <div className='flex items-baseline justify-between gap-2'>
                        <span className='text-foreground font-medium tabular-nums'>
                          {new Date(effectiveSlot).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                        <span className='text-xs text-muted-foreground tabular-nums'>
                          {new Date(effectiveSlot).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className='text-placeholder'>Chưa chọn</span>
                    )}
                  </div>
                </div>

                {/* Đường răng cưa như phiếu giấy xé */}
                <div
                  className='relative py-1'
                  aria-hidden='true'
                >
                  <div className='absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-background border border-border' />
                  <div className='absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-background border border-border' />
                  <div className='mx-5 border-t border-dashed border-border' />
                </div>

                {/* Total Payment Details */}
                <div className='px-5 py-4 space-y-2.5'>
                  {(() => {
                    const base = selectedService
                      ? Number(
                          getVehiclePricing(selectedService)?.price ??
                            selectedService.basePrice,
                        )
                      : 0;
                    const selectedSlotData = availableSlots.find(
                      (s: AvailableSlot) => s.scheduledAt === effectiveSlot,
                    );
                    const localGoldenDiscount =
                      !preview &&
                      selectedSlotData?.isGoldenHour &&
                      (selectedSlotData.discountPercent ?? 0) > 0
                        ? Math.round(
                            (base * selectedSlotData.discountPercent) / 100,
                          )
                        : 0;
                    const original = preview?.originalAmount ?? base;
                    const discount =
                      preview?.discountAmount ?? localGoldenDiscount;
                    const total = preview?.amount ?? base - localGoldenDiscount;
                    return (
                      <>
                        <div className='flex justify-between items-center text-sm text-muted-foreground'>
                          <span>Giá niêm yết</span>
                          <span className='tabular-nums'>
                            {formatCurrency(original)}
                          </span>
                        </div>

                        {discount > 0 && (
                          <div className='flex justify-between items-center text-sm text-success'>
                            <span className='flex items-center gap-1'>
                              <Ticket className='w-3.5 h-3.5' />
                              {selectedVoucherId && !preview?.voucherError
                                ? 'Giảm giá (voucher)'
                                : 'Giảm giá'}
                            </span>
                            <span className='tabular-nums'>
                              − {formatCurrency(discount)}
                            </span>
                          </div>
                        )}

                        {(preview?.isGoldenHour
                          ? preview.tierDiscountPercent > 0
                          : localGoldenDiscount > 0) && (
                          <p className='text-[11px] text-muted-foreground -mt-1'>
                            Khung giờ vàng
                            {preview?.tierName
                              ? ` · hạng ${getTierLabel(preview.tierName)} giảm ${preview.tierDiscountPercent}%`
                              : ` · giảm ${selectedSlotData?.discountPercent}%`}
                          </p>
                        )}

                        <div className='flex justify-between items-baseline pt-1.5'>
                          <span className='text-sm font-semibold text-foreground'>
                            Tổng thanh toán
                          </span>
                          <span className='font-heading text-xl font-bold tracking-tight text-foreground tabular-nums'>
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Tích lũy lượt rửa (thay banner đầu trang) */}
                {myLoyalty && (
                  <div className='px-5 pb-5'>
                    <div className='rounded-lg bg-muted/50 px-3.5 py-3'>
                      <div className='flex items-center justify-between text-[11px] font-medium mb-1.5'>
                        <span className='text-muted-foreground'>
                          Tích lượt rửa nhận voucher
                        </span>
                        <span className='tabular-nums text-foreground'>
                          {towardVoucher}/{washesPerVoucher}
                        </span>
                      </div>
                      <div className='h-1.5 rounded-full bg-border overflow-hidden'>
                        <div
                          className='h-full rounded-full bg-warning transition-all'
                          style={{
                            width: `${Math.min((towardVoucher / washesPerVoucher) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      {/* Giá trị voucher kế tiếp do BE tính sẵn theo hạng. */}
                      <p className='mt-1.5 text-[11px] text-muted-foreground'>
                        {washesToVoucher > 0
                          ? `Còn ${washesToVoucher} lượt rửa hợp lệ để nhận voucher thưởng${
                              myLoyalty.estimatedNextVoucherVnd
                                ? ` khoảng ${formatCurrency(myLoyalty.estimatedNextVoucherVnd)}`
                                : ''
                            }.`
                          : 'Bạn sắp nhận voucher thưởng!'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
