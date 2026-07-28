'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import {
  adminGetWorkOrders,
  adminAssignWasher,
  adminGetWorkOrdersQueue,
  adminGetWasherStatus,
} from '@/lib/admin-api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useState, useMemo } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import {
  Wrench, Users,
  Clock, ChevronDown, RefreshCw,
  Camera, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/getErrorMessage';

interface UserData {
  _id: string;
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  /** Trạng thái live từ /admin/shifts/washer-status: free | assigned | in_progress. */
  status?: string;
}

interface WorkOrderData {
  id: string;
  orderId: string | {
    _id: string;
    customerName?: string;
    userId?: { fullName?: string };
    vehicleId?: { licensePlate?: string };
    licensePlate?: string;
    serviceTypeId?: { name?: string };
    serviceName?: string;
    amount?: number;
    totalPrice?: number;
    status?: string;
  };
  assignedWasherId?: string;
  assignedWasherName?: string;
  washerId?: {
    _id: string;
    fullName?: string;
    name?: string;
  };
  // BE đã bỏ luồng QC: done là trạng thái kết thúc, order tự complete.
  status: 'waiting' | 'assigned' | 'in_progress' | 'done';
  createdAt?: string;
  vehicleSnapshot?: {
    plate?: string;
    vehicleTypeName?: string;
    color?: string;
  };
  serviceName?: string;
  [key: string]: unknown;
}



export default function ManagerWorkOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'fifo'>('all');
  // Ảnh kiểm định chỉ để XEM ở trang Vận hành (thu ngân chụp ảnh trước khi rửa
  // ở trang Lịch hẹn, thợ chụp ảnh sau khi rửa). Lưu chung localStorage theo orderId.
  const [inspectionPhotos] = useState<Record<string, { preWash: string[]; postWash: string[] }>>(() => {
    const stored = localStorage.getItem('wave_inspection_photos');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // States cho Dialog giao việc
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<WorkOrderData | null>(null);
  const [selectedWasherId, setSelectedWasherId] = useState('');

  // Lấy danh sách Work Orders
  const { data: workOrdersRes, isLoading: isLoadingWO, refetch: refetchWO } = useQuery({
    queryKey: ['manager-work-orders'],
    queryFn: () => adminGetWorkOrders(),
  });

  // Realtime: check-in tạo work order mới / giao thợ / bắt đầu / hoàn thành
  // → bảng điều phối và hàng đợi FIFO tự cập nhật.
  const invalidateWorkOrders = () => {
    void qc.invalidateQueries({ queryKey: ['manager-work-orders'] });
    void qc.invalidateQueries({ queryKey: ['manager-work-orders-queue'] });
  };
  useSocketEvent('order:status', invalidateWorkOrders);
  useSocketEvent('wash:assigned', invalidateWorkOrders);
  useSocketEvent('wash:started', invalidateWorkOrders);
  useSocketEvent('wash:completed', invalidateWorkOrders);

  // Lấy danh sách hàng đợi FIFO
  const { data: fifoQueueRes, isLoading: isLoadingFIFO, refetch: refetchFIFO } = useQuery({
    queryKey: ['manager-work-orders-queue'],
    queryFn: () => adminGetWorkOrdersQueue(),
    enabled: statusFilter === 'fifo',
  });

  // Danh sách thợ THẬT từ /admin/shifts/washer-status (kèm trạng thái bận/rảnh).
  // Không dùng dữ liệu cứng dự phòng — BE trả gì hiển thị nấy.
  const { data: washersRes } = useQuery({
    queryKey: ['washer-status'],
    queryFn: () => adminGetWasherStatus(),
  });

  const allWorkOrders: WorkOrderData[] = useMemo(
    () => workOrdersRes?.data?.data ?? workOrdersRes?.data ?? [],
    [workOrdersRes],
  );
  const fifoQueue: WorkOrderData[] = useMemo(
    () => fifoQueueRes?.data ?? [],
    [fifoQueueRes],
  );
  const washers: UserData[] = useMemo(
    () =>
      (washersRes?.data ?? []).map((w) => ({
        _id: w.washerId,
        id: w.washerId,
        name: w.name,
        email: w.email,
        role: 'washer',
        status: w.status,
      })),
    [washersRes],
  );

  const isPageLoading = statusFilter === 'fifo' ? isLoadingFIFO : isLoadingWO;
  const refetch = () => {
    if (statusFilter === 'fifo') {
      refetchFIFO();
    } else {
      refetchWO();
    }
  };

  // Chỉ gán được thợ đang rảnh — trạng thái lấy thẳng từ BE (washer-status),
  // không suy diễn phía client nữa.
  const availableWashers = useMemo(
    () => washers.filter((w) => w.status === 'free'),
    [washers],
  );

  // Lọc phiếu rửa xe theo trạng thái ở frontend để khớp tab
  const workOrders = useMemo(() => {
    if (statusFilter === 'fifo') {
      return fifoQueue;
    }
    return allWorkOrders.filter((wo) => {
      if (statusFilter === 'all') {
        return wo.status !== 'done'; // Chỉ hiện những phiếu đang hoạt động
      }
      if (statusFilter === 'pending') {
        return wo.status === 'waiting' || wo.status === 'assigned';
      }
      if (statusFilter === 'in_progress') {
        return wo.status === 'in_progress';
      }
      return true;
    });
  }, [allWorkOrders, statusFilter, fifoQueue]);

  // Phân trang phía client cho lưới phiếu rửa xe.
  const PER_PAGE = 9;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(workOrders.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedWorkOrders = useMemo(
    () => workOrders.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [workOrders, safePage],
  );

  // Mutation giao việc cho thợ
  const assignWasherMutation = useMutation({
    mutationFn: async ({ woId, washerId }: { woId: string; washerId: string }) => {
      await adminAssignWasher(woId, washerId);
    },
    onSuccess: () => {
      toast.success('Đã phân công thợ phụ trách rửa xe thành công!');
      setIsAssignOpen(false);
      setAssignTarget(null);
      setSelectedWasherId('');
      qc.invalidateQueries({ queryKey: ['manager-work-orders'] });
      qc.invalidateQueries({ queryKey: ['manager-dashboard-workorders'] });
    },
    onError: (err) => {
      toast.error('Không thể giao việc cho thợ.', {
        description: getErrorMessage(err),
      });
    }
  });

  const handleOpenAssign = (wo: WorkOrderData) => {
    setAssignTarget(wo);
    setIsAssignOpen(true);
  };

  return (
    <>
      <AdminTopbar title='Vận hành Rửa xe' subtitle='Giao việc cho thợ và theo dõi các xe đang rửa. Đơn tự hoàn thành khi thợ rửa xong.' />
      <main className='flex-1 p-8 overflow-y-auto bg-muted/40'>
        <div className='max-w-7xl mx-auto'>

          {/* Status Tabs Filter */}
          <div className='flex items-center justify-between mb-8 border-b border-border pb-2'>
            <div className='flex gap-6'>
              {(['all', 'pending', 'in_progress', 'fifo'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setStatusFilter(tab);
                    setPage(1);
                  }}
                  className={`pb-3 text-sm font-bold transition-all relative ${
                    statusFilter === tab ? 'text-primary' : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  {tab === 'all' && 'Tất cả phiếu'}
                  {tab === 'pending' && 'Chờ giao thợ'}
                  {tab === 'in_progress' && 'Đang rửa xe'}
                  {tab === 'fifo' && 'Xe chờ tới lượt (Hôm nay)'}
                  
                  {statusFilter === tab && (
                    <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full' />
                  )}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => refetch()}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-muted-foreground bg-card hover:border-border transition-all shadow-xs'
            >
              <RefreshCw className='w-3.5 h-3.5' /> Làm mới
            </button>
          </div>

          {/* Cards Grid */}
          {isPageLoading ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='bg-card rounded-xl p-6 border border-border shadow-xs animate-pulse h-48' />
              ))}
            </div>
          ) : workOrders.length === 0 ? (
            <div className='bg-card rounded-xl p-16 text-center border border-border shadow-xs max-w-lg mx-auto mt-12'>
              <div className='w-16 h-16 rounded-xl bg-accent flex items-center justify-center mx-auto mb-6 text-primary'>
                <Wrench className='w-8 h-8' />
              </div>
              <h3 className='font-heading text-lg font-semibold text-foreground mb-2'>Không tìm thấy phiếu rửa xe nào</h3>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                Hiện tại không có xe nào ở trạng thái này. Vui lòng kiểm tra mục &quot;Đơn đặt lịch&quot; để tiến hành Check-in nhận xe mới.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {pagedWorkOrders.map((wo) => {
                const customer = `Mã phiếu: ${wo.code || wo.id.slice(-6).toUpperCase()}`;
                const plate = wo.vehicleSnapshot?.plate ?? '-';
                const service = wo.serviceName ?? '-';
                // Ảnh lưu theo orderId để khớp với ảnh thu ngân chụp ở trang Lịch hẹn.
                const woOrderId =
                  typeof wo.orderId === 'string'
                    ? wo.orderId
                    : (wo.orderId?._id ?? wo.id);
                
                // Ưu tiên tên thợ BE trả kèm (manager không gọi được /admin/users),
                // fallback về danh sách washers nếu có.
                const washerObj = washers.find((w) => w._id === wo.assignedWasherId || w.id === wo.assignedWasherId);
                const washer =
                  wo.assignedWasherName ??
                  washerObj?.fullName ??
                  washerObj?.name ??
                  (wo.assignedWasherId ? 'Đã giao (Chờ nhận)' : undefined);

                const isPending = wo.status === 'waiting' || wo.status === 'assigned';
                const isInProgress = wo.status === 'in_progress';

                return (
                  <div
                    key={wo.id}
                    className={`bg-card rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col p-6 relative overflow-hidden ${
                      isPending ? 'border-warning/30 hover:border-warning/30' :
                      isInProgress ? 'border-primary/30 hover:border-primary ring-2 ring-primary/20' :
                      'border-success/30 hover:border-success/30'
                    }`}
                  >
                    {/* Header: License Plate & Status Badge */}
                    <div className='flex items-center justify-between mb-4'>
                      <span className='font-mono font-semibold text-primary bg-accent px-2.5 py-1 rounded-xl text-xs border border-primary/30 shadow-xs'>
                        {plate}
                      </span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isPending ? 'bg-warning/10 text-warning-foreground border border-warning/30' :
                        isInProgress ? 'bg-info/10 text-info border border-info/30' :
                        'bg-success/10 text-success border border-success/30'
                      }`}>
                        {wo.status === 'waiting' && 'Chờ giao thợ'}
                        {wo.status === 'assigned' && 'Đã giao thợ'}
                        {isInProgress && 'Đang rửa xe'}
                        {wo.status === 'done' && 'Hoàn thành'}
                      </span>
                    </div>

                    {/* Customer & Service info */}
                    <div className='flex-1 flex flex-col gap-2.5 mb-6'>
                      <div>
                        <p className='text-muted-foreground text-[10px] uppercase font-bold tracking-wider'>Định danh phiếu</p>
                        <p className='font-bold text-foreground text-sm'>{customer}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground text-[10px] uppercase font-bold tracking-wider'>Gói dịch vụ</p>
                        <p className='font-bold text-foreground text-sm'>{service}</p>
                      </div>
                      
                      {/* Thợ phụ trách */}
                      <div className='mt-2 border-t border-border pt-3'>
                        <p className='text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1'>Thợ phụ trách</p>
                        {washer ? (
                          <div className='flex items-center gap-1.5 text-foreground text-sm font-semibold'>
                            <Users className='w-4 h-4 text-muted-foreground' />
                            {washer}
                          </div>
                        ) : (
                          <span className='text-warning font-bold text-xs italic flex items-center gap-1 bg-warning/10 px-2 py-0.5 rounded-lg border border-warning/30 w-fit'>
                            <Clock className='w-3.5 h-3.5' /> Đang đợi phân công thợ
                          </span>
                        )}
                      </div>
                      {/* Ảnh kiểm định xe (CHỈ XEM) */}
                      <div className='mt-3 space-y-3.5 border-t border-border pt-3'>
                        {/* Trước khi rửa (Check-in) */}
                        <div>
                          <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1'>
                            <Camera className='w-3.5 h-3.5 text-primary' />
                            Ảnh trước khi rửa (Thu ngân chụp)
                          </p>
                          {((wo.checkinPhotos && (wo.checkinPhotos as string[]).length > 0) || (inspectionPhotos[woOrderId]?.preWash && inspectionPhotos[woOrderId].preWash.length > 0)) ? (
                            <div className='flex gap-2 overflow-x-auto pb-1 scrollbar-thin'>
                              {((wo.checkinPhotos as string[]) || inspectionPhotos[woOrderId]?.preWash || []).map((photo, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={() => setPreviewPhoto(photo)}
                                  className='relative w-12 h-12 rounded-lg overflow-hidden border border-border shadow-xs bg-muted/40 cursor-pointer hover:border-primary transition-all shrink-0 group'
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo} alt='Pre-wash' className='w-full h-full object-cover group-hover:scale-105 transition-transform' />
                                  <div className='absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                    <Eye className='w-3 h-3 text-white' />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className='text-xs italic text-muted-foreground font-medium pl-1'>Chưa có ảnh trước khi rửa.</p>
                          )}
                        </div>

                        {/* Sau khi rửa */}
                        <div>
                          <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1'>
                            <Camera className='w-3.5 h-3.5 text-success' />
                            Ảnh sau khi rửa (Nghiệm thu sạch đẹp)
                          </p>
                          {(inspectionPhotos[woOrderId]?.postWash && inspectionPhotos[woOrderId].postWash.length > 0) ? (
                            <div className='flex gap-2 overflow-x-auto pb-1 scrollbar-thin'>
                              {inspectionPhotos[woOrderId].postWash.map((photo, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={() => setPreviewPhoto(photo)}
                                  className='relative w-12 h-12 rounded-lg overflow-hidden border border-border shadow-xs bg-muted/40 cursor-pointer hover:border-success transition-all shrink-0 group'
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo} alt='Post-wash' className='w-full h-full object-cover group-hover:scale-105 transition-transform' />
                                  <div className='absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                    <Eye className='w-3 h-3 text-white' />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className='text-xs italic text-muted-foreground font-medium pl-1'>Chưa có ảnh sau khi rửa.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className='mt-auto pt-4 border-t border-border'>
                      {isPending && (
                        <button
                          onClick={() => handleOpenAssign(wo)}
                          className='w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-1.5'
                        >
                          <Users className='w-4 h-4' />
                          {wo.status === 'assigned' ? 'Đổi thợ phụ trách' : 'Giao thợ rửa xe'}
                        </button>
                      )}

                      {isInProgress && (
                        <div className='flex gap-2 w-full'>
                          <button
                            onClick={() => handleOpenAssign(wo)}
                            className='flex-1 py-2 rounded-xl border border-border hover:border-border text-muted-foreground font-bold text-xs transition-all flex items-center justify-center gap-1'
                          >
                            <Users className='w-3.5 h-3.5' /> Đổi thợ
                          </button>
                          <div className='flex-[1.5] bg-muted/40 border border-border rounded-xl px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-primary'>
                            <Clock className='w-4 h-4 animate-spin' /> Đang rửa...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!isPageLoading && workOrders.length > 0 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
              className='mt-8'
            />
          )}
        </div>
      </main>

      {/* ── DIALOG: Giao việc thợ rửa xe ── */}
      {isAssignOpen && assignTarget && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-card rounded-xl border border-border shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center gap-3 mb-4 text-primary'>
              <div className='w-10 h-10 rounded-xl bg-accent flex items-center justify-center'>
                <Users className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-heading font-semibold text-foreground text-base'>Phân công thợ rửa xe</h3>
                <p className='text-xs text-muted-foreground'>Chọn thợ rửa xe phụ trách cho xe {assignTarget.vehicleSnapshot?.plate ?? ''}</p>
              </div>
            </div>

            <div className='mb-6'>
              <label className='block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider'>Chọn nhân viên rửa xe</label>
              <div className='relative'>
                <select
                  value={selectedWasherId}
                  onChange={(e) => setSelectedWasherId(e.target.value)}
                  disabled={availableWashers.length === 0}
                  className='w-full appearance-none bg-card border border-border rounded-xl px-4 py-3 pr-10 text-sm font-semibold text-foreground focus:outline-none focus:border-primary transition-all disabled:bg-muted/40 disabled:text-placeholder'
                >
                  <option value=''>-- Chọn nhân viên đang rảnh --</option>
                  {availableWashers.map((w) => {
                    const washerId = w._id ?? w.id ?? '';
                    return (
                      <option key={washerId} value={washerId}>
                        {w.fullName ?? w.name} ({w.email})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className='absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
              </div>
              {availableWashers.length === 0 && (
                <p className='mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning'>
                  <Clock className='w-3.5 h-3.5 shrink-0' />
                  Tất cả thợ đang bận (được giao việc hoặc đang rửa). Vui lòng đợi
                  thợ hoàn thành.
                </p>
              )}
            </div>

            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => { setIsAssignOpen(false); setAssignTarget(null); }}
                className='px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted/50 transition-all'
              >
                Hủy bỏ
              </button>
              <button
                disabled={!selectedWasherId || assignWasherMutation.isPending}
                onClick={() => assignWasherMutation.mutate({ woId: assignTarget.id, washerId: selectedWasherId })}
                className='px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md'
              >
                Xác nhận giao việc
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Lightbox Preview Modal */}
      {previewPhoto && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4' onClick={() => setPreviewPhoto(null)}>
          <div className='relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-150'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewPhoto} alt='Enlarged Preview' className='rounded-xl max-w-full max-h-[80vh] object-contain shadow-2xl border border-white/10' />
            <button 
              onClick={() => setPreviewPhoto(null)} 
              className='absolute top-3 right-3 bg-black/50 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-white/10 animate-pulse'
            >
              Đóng xem ảnh (Esc)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
