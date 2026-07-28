'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, CalendarX2, SearchX, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/getErrorMessage';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminGetShifts,
  adminCreateShift,
  adminBulkCreateShifts,
  adminUpdateShift,
  adminToggleShift,
  adminGetWasherStatus,
} from '@/lib/admin-api';
import {
  getShiftId,
  getStaffName,
  getRoleLabel,
  getShiftStatus,
  sortShifts,
  isWithinRange,
  STATUS_META,
  type Shift,
  type UserData,
  type DateRangeKey,
  type SortKey,
} from '@/lib/shift-helpers';
import {
  ShiftToolbar,
  type StatusFilter,
  type ShiftView,
  type RoleOption,
} from '@/components/admin/shifts/ShiftToolbar';
import { ShiftTable } from '@/components/admin/shifts/ShiftTable';
import { ShiftCard } from '@/components/admin/shifts/ShiftCard';
import {
  ShiftTableSkeleton,
  ShiftCardSkeleton,
} from '@/components/admin/shifts/ShiftSkeletons';
import { ShiftModal } from '@/components/admin/shifts/ShiftModal';
import { ShiftCancelDialog } from '@/components/admin/shifts/ShiftCancelDialog';
import { Pagination } from '@/components/shared/Pagination';

const PAGE_SIZE = 10;

export default function AdminShiftsPage() {
  const qc = useQueryClient();

  // Modal & dialog state
  const [editShift, setEditShift] = useState<Shift | null | false>(false);
  const [cancelTarget, setCancelTarget] = useState<Shift | null>(null);

  // Filter / view state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [sort, setSort] = useState<SortKey>('latest');
  const [view, setView] = useState<ShiftView>('table');
  const [page, setPage] = useState(1);

  // Danh sách Shifts
  const {
    data: shiftsRes,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-shifts'],
    queryFn: () => adminGetShifts({ limit: 100 }),
  });

  // Danh sách thợ thật từ /admin/shifts/washer-status — chỉ dùng để hiển thị
  // tên cho các ca legacy còn staff_id (BE đã bỏ GET /admin/shifts/staff khi
  // chuyển sang ca ẩn danh theo sức chứa). Giữ nguyên queryKey + shape raw
  // như WasherStatusMini/Board để dùng chung cache, map sang UserData ở dưới.
  const { data: washerStatusRes } = useQuery({
    queryKey: ['washer-status'],
    queryFn: () => adminGetWasherStatus(),
  });
  const usersRes: UserData[] = useMemo(
    () =>
      (washerStatusRes?.data ?? []).map((w) => ({
        _id: w.washerId,
        id: w.washerId,
        name: w.name,
        email: w.email,
        role: 'washer',
      })) as UserData[],
    [washerStatusRes],
  );

  const shifts: Shift[] = useMemo(
    () => shiftsRes?.data?.data ?? shiftsRes?.data ?? [],
    [shiftsRes],
  );
  const staffList: UserData[] = useMemo(() => usersRes ?? [], [usersRes]);

  // ─── Mutations (API contract giữ nguyên) ──────────────────────────
  const createShift = useMutation({
    mutationFn: adminCreateShift,
    onSuccess: (res) => {
      // Fullday tạo 2 bản ghi (sáng + chiều) — nói rõ để admin không tưởng bị double.
      const count = Array.isArray(res?.data) ? res.data.length : 1;
      toast.success(
        count > 1
          ? `Đã tạo ${count} ca làm việc: sáng (08:00–12:00) và chiều (14:00–17:00).`
          : 'Thêm ca làm việc mới thành công!',
      );
      qc.invalidateQueries({ queryKey: ['admin-shifts'] });
      setEditShift(false);
    },
    onError: (err: unknown) => {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đã xảy ra lỗi khi tạo ca trực.';
      toast.error(`Thêm thất bại: ${errMsg}`);
    },
  });

  // Tạo ca hàng loạt theo khoảng ngày — POST /admin/shifts/bulk. BE bỏ qua ngày
  // trùng/đã qua và trả về summary { created, skipped, meta }.
  const bulkCreateShift = useMutation({
    mutationFn: adminBulkCreateShifts,
    onSuccess: (res) => {
      const meta = res?.data?.meta;
      const created = meta?.createdCount ?? 0;
      const skipped = meta?.skippedCount ?? 0;
      if (created === 0) {
        toast.warning(
          skipped > 0
            ? `Không tạo ca nào — ${skipped} ca bị bỏ qua (đã có ca hoặc đã qua giờ).`
            : 'Không có ngày nào phù hợp để tạo ca.',
        );
      } else {
        toast.success(
          skipped > 0
            ? `Đã tạo ${created} ca, bỏ qua ${skipped} ca (đã có ca hoặc đã qua giờ).`
            : `Đã tạo ${created} ca làm việc.`,
        );
      }
      qc.invalidateQueries({ queryKey: ['admin-shifts'] });
      setEditShift(false);
    },
    onError: (err: unknown) => {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đã xảy ra lỗi khi tạo ca hàng loạt.';
      toast.error(`Tạo ca hàng loạt thất bại: ${errMsg}`);
    },
  });

  const updateShift = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminUpdateShift(id, data),
    onSuccess: () => {
      toast.success('Cập nhật ca trực nhân viên thành công!');
      qc.invalidateQueries({ queryKey: ['admin-shifts'] });
      setEditShift(false);
    },
    onError: (err: unknown) => {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đã xảy ra lỗi khi cập nhật ca trực.';
      toast.error(`Cập nhật thất bại: ${errMsg}`);
    },
  });

  // Thao tác trạng thái duy nhất còn lại là hủy ca ({ status: 'cancelled' }) —
  // active/completed do BE tự chuyển theo thời gian.
  const cancelShift = useMutation({
    mutationFn: (id: string) => adminToggleShift(id, 'cancelled'),
    onSuccess: () => {
      toast.success('Đã hủy ca làm việc.');
      qc.invalidateQueries({ queryKey: ['admin-shifts'] });
    },
    onError: (err: unknown) => {
      toast.error('Không thể hủy ca làm việc.', {
        description: getErrorMessage(err),
      });
    },
  });

  const handleSave = (d: Record<string, unknown>) => {
    if (editShift && (editShift as Shift)._id) {
      updateShift.mutate({ id: (editShift as Shift)._id!, data: d });
    } else if ('fromDate' in d) {
      // Payload chế độ "Nhiều ngày" từ ShiftModal.
      bulkCreateShift.mutate(
        d as unknown as Parameters<typeof adminBulkCreateShifts>[0],
      );
    } else {
      createShift.mutate(d);
    }
  };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    cancelShift.mutate(getShiftId(cancelTarget), {
      onSuccess: () => setCancelTarget(null),
    });
  };

  // ─── Role filter options (dynamic từ data) ────────────────────────
  const roleOptions: RoleOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const s of shifts) if (s.shiftType) set.add(s.shiftType);
    return [
      { value: 'all', label: 'Tất cả vai trò' },
      ...Array.from(set).map((t) => ({ value: t, label: getRoleLabel(t) })),
    ];
  }, [shifts]);

  // ─── Lọc + sắp xếp ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = shifts.filter((s) => {
      const status = getShiftStatus(s);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (roleFilter !== 'all' && s.shiftType !== roleFilter) return false;
      if (!isWithinRange(s, dateRange)) return false;
      if (term) {
        const haystack = [
          getStaffName(s, staffList) ?? '',
          getRoleLabel(s.shiftType),
          s.stationName ?? '',
          s.note ?? '',
          STATUS_META[status].label,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return sortShifts(list, sort);
  }, [shifts, staffList, statusFilter, roleFilter, dateRange, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const hasFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    roleFilter !== 'all' ||
    dateRange !== 'all';

  // Đổi bộ lọc/sắp xếp thì quay về trang 1 để không rơi vào trang rỗng.
  // Gộp vào chính handler thay vì useEffect (tránh cascading render).
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleStatus = (v: StatusFilter) => {
    setStatusFilter(v);
    setPage(1);
  };
  const handleRole = (v: string) => {
    setRoleFilter(v);
    setPage(1);
  };
  const handleDateRange = (v: DateRangeKey) => {
    setDateRange(v);
    setPage(1);
  };
  const handleSort = (v: SortKey) => {
    setSort(v);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
    setDateRange('all');
    setPage(1);
  };

  const cardGrid = (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {paged.map((shift) => (
        <ShiftCard
          key={getShiftId(shift)}
          shift={shift}
          staffList={staffList}
          onEdit={(s) => setEditShift(s)}
          onCancelRequest={(s) => setCancelTarget(s)}
        />
      ))}
    </div>
  );

  const pagination = (
    <div className='flex flex-col items-center gap-1.5 pt-1'>
      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      {filtered.length > PAGE_SIZE && (
        <p className='text-xs text-muted-foreground tabular-nums'>
          Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
          {Math.min(safePage * PAGE_SIZE, filtered.length)} /{' '}
          {filtered.length} ca
        </p>
      )}
    </div>
  );

  return (
    <>
      <AdminTopbar
        title='Phân ca làm việc'
        subtitle='Quản lý lịch làm, trạng thái ca và phân bổ nhân sự'
      />

      <main className='flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-5'>
          {/* Header / actions */}
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h2 className='font-heading text-lg font-bold text-foreground'>
                Danh sách ca làm việc
              </h2>
              <p className='mt-0.5 text-sm text-muted-foreground'>
                Theo dõi lịch làm, trạng thái và sức chứa của từng ca.
              </p>
            </div>
            <div className='flex items-center gap-2.5'>
              <Button
                variant='outline'
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={isRefetching ? 'animate-spin' : ''} />
                Làm mới
              </Button>
              <Button onClick={() => setEditShift(null)}>
                <Plus />
                Thêm ca làm việc
              </Button>
            </div>
          </div>

          {/* Trang danh sách không gắn cụm KPI tổng quan — số liệu tổng đã có
              ở dashboard; bộ lọc trạng thái trên toolbar là đủ để thu hẹp. */}

          {/* Toolbar */}
          <ShiftToolbar
            search={search}
            onSearchChange={handleSearch}
            status={statusFilter}
            onStatusChange={handleStatus}
            role={roleFilter}
            onRoleChange={handleRole}
            roleOptions={roleOptions}
            dateRange={dateRange}
            onDateRangeChange={handleDateRange}
            sort={sort}
            onSortChange={handleSort}
            view={view}
            onViewChange={setView}
            resultCount={filtered.length}
            totalCount={shifts.length}
          />

          {/* Content */}
          {isLoading ? (
            view === 'table' ? (
              <>
                <div className='hidden md:block'>
                  <ShiftTableSkeleton />
                </div>
                <div className='md:hidden'>
                  <ShiftCardSkeleton />
                </div>
              </>
            ) : (
              <ShiftCardSkeleton />
            )
          ) : isError ? (
            <EmptyState
              icon={AlertCircle}
              title='Không tải được danh sách ca'
              description='Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng thử lại.'
              action={
                <Button variant='outline' onClick={() => refetch()}>
                  <RefreshCw />
                  Thử lại
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                title='Không có ca nào khớp bộ lọc'
                description='Thử thay đổi từ khoá hoặc bộ lọc để xem thêm ca làm việc.'
                action={
                  <Button variant='outline' onClick={resetFilters}>
                    Xoá bộ lọc
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={CalendarX2}
                title='Chưa có ca làm việc nào'
                description='Bắt đầu bằng cách phân ca trực đầu tiên cho nhân viên.'
                action={
                  <Button onClick={() => setEditShift(null)}>
                    <Plus />
                    Thêm ca làm việc
                  </Button>
                }
              />
            )
          ) : view === 'table' ? (
            <>
              {/* Desktop: bảng — Mobile: thẻ */}
              <div className='hidden md:block'>
                <ShiftTable
                  shifts={paged}
                  staffList={staffList}
                  onEdit={(s) => setEditShift(s)}
                  onCancelRequest={(s) => setCancelTarget(s)}
                />
              </div>
              <div className='md:hidden'>{cardGrid}</div>
              {pagination}
            </>
          ) : (
            <>
              {cardGrid}
              {pagination}
            </>
          )}
        </div>
      </main>

      {/* Create / Edit modal */}
      {editShift !== false && (
        <ShiftModal
          item={editShift}
          onClose={() => setEditShift(false)}
          onSave={handleSave}
          isPending={
            createShift.isPending ||
            bulkCreateShift.isPending ||
            updateShift.isPending
          }
        />
      )}

      {/* Cancel confirm */}
      <ShiftCancelDialog
        shift={cancelTarget}
        staffList={staffList}
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={handleCancelConfirm}
        isPending={cancelShift.isPending}
      />
    </>
  );
}
