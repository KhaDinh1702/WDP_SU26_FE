'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import {
  adminGetUsers, adminUpdateUserRole,
  adminUpdateUserStatus, adminResetUserPassword,
} from '@/lib/admin-api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, RefreshCw, Ban, KeyRound, ChevronDown } from 'lucide-react';

/** Khớp `UserResponse` (Swagger). Trạng thái là `isActive`, KHÔNG phải `status`. */
interface UserData {
  _id?: string;
  id?: string;
  role?: string;
  isActive?: boolean;
  fullName?: string;
  name?: string;
  email?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const roleConfig: Record<string, { label: string; cls: string }> = {
  admin:    { label: 'Admin',    cls: 'bg-primary/10 text-primary' },
  manager:  { label: 'Quản lý',   cls: 'bg-info/10 text-info' },
  cashier:  { label: 'Thu ngân',  cls: 'bg-warning/10 text-warning-foreground' },
  washer:   { label: 'Thợ rửa xe', cls: 'bg-accent text-primary' },
  customer: { label: 'Khách hàng', cls: 'bg-muted text-muted-foreground' },
};

const statusConfig: Record<'active' | 'inactive', { label: string; cls: string }> = {
  active:   { label: 'Hoạt động', cls: 'bg-success/10 text-success' },
  inactive: { label: 'Vô hiệu',   cls: 'bg-destructive/10 text-destructive' },
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminGetUsers({
      page: 1,
      limit: 100,
      ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminUpdateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  // PATCH /admin/users/:id/status nhận `{ isActive: boolean }`.
  const changeStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateUserStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const resetPwd = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => adminResetUserPassword(id, password),
    onSuccess: () => { setResetId(null); setNewPwd(''); },
  });

  const users: UserData[] = data?.data?.data ?? data?.data ?? [];

  const filtered = search
    ? users.filter((u: UserData) => {
        const searchStr = `${u.fullName || u.name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase();
        return searchStr.includes(search.toLowerCase());
      })
    : users;

  const itemsPerPage = 10;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedUsers = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <>
      <AdminTopbar title='Quản lý người dùng' subtitle='Xem, phân quyền và quản lý tài khoản' />
      <main className='flex-1 p-8 overflow-y-auto'>
        <div className='max-w-7xl mx-auto'>

          {/* Filters */}
          <div className='flex flex-wrap items-center gap-3 mb-6'>
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-placeholder' />
              <input type='text' placeholder='Tìm kiếm người dùng...'
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className='w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-all' />
            </div>
            <div className='relative'>
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className='appearance-none bg-card border border-border rounded-xl px-4 py-2.5 pr-8 text-sm font-semibold focus:outline-none cursor-pointer'>
                <option value='all'>Tất cả vai trò</option>
                <option value='admin'>Admin</option>
                <option value='manager'>Quản lý</option>
                <option value='cashier'>Thu ngân</option>
                <option value='washer'>Thợ rửa xe</option>
                <option value='customer'>Khách hàng</option>
              </select>
              <ChevronDown className='absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
            </div>
            <button onClick={() => refetch()}
              className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold hover:border-primary/30 transition-all'>
              <RefreshCw className='w-4 h-4 text-foreground/50' />Làm mới
            </button>
            <span className='ml-auto text-xs font-semibold text-muted-foreground'>Tổng: {totalItems} tài khoản</span>
          </div>

          {/* Table */}
          <div className='bg-card rounded-xl border border-border/50 shadow-xs overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-muted/50 border-b border-border/50'>
                    {['Người dùng', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map((h) => (
                      <th key={h} className='text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/30'>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className='px-5 py-4'><div className='h-4 bg-muted animate-pulse rounded-lg' /></td>
                      ))}</tr>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <tr><td colSpan={6} className='px-5 py-16 text-center text-muted-foreground font-semibold'>Không có dữ liệu</td></tr>
                  ) : (
                    paginatedUsers.map((u: UserData) => {
                      const role = roleConfig[u.role ?? ''] ?? { label: u.role, cls: 'bg-muted text-muted-foreground' };
                      const isActive = u.isActive !== false;
                      const status = isActive ? statusConfig.active : statusConfig.inactive;
                      const id = u._id ?? u.id ?? '';
                      return (
                        <tr key={id} className='hover:bg-muted/20 transition-colors'>
                          <td className='px-5 py-4'>
                            <div className='flex items-center gap-3'>
                              <div className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm'>
                                {(u.fullName ?? u.name ?? '?')[0]?.toUpperCase()}
                              </div>
                              <span className='font-semibold text-foreground'>{u.fullName ?? u.name ?? '-'}</span>
                            </div>
                          </td>
                          <td className='px-5 py-4 text-muted-foreground text-sm'>{u.email ?? '-'}</td>
                          <td className='px-5 py-4'>
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${role.cls}`}>{role.label}</span>
                          </td>
                          <td className='px-5 py-4'>
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${status.cls}`}>{status.label}</span>
                          </td>
                          <td className='px-5 py-4 text-foreground/50 text-xs'>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td className='px-5 py-4'>
                            <div className='flex items-center gap-2'>
                              {/* Role select */}
                              <select value={u.role}
                                onChange={(e) => changeRole.mutate({ id, role: e.target.value })}
                                className='text-xs border border-border rounded-lg px-2 py-1 bg-card focus:outline-none cursor-pointer'>
                                <option value='customer'>Khách hàng</option>
                                <option value='washer'>Thợ rửa xe</option>
                                <option value='cashier'>Thu ngân</option>
                                <option value='manager'>Quản lý</option>
                                <option value='admin'>Admin</option>
                              </select>
                              {/* Toggle status */}
                              <button
                                onClick={() => changeStatus.mutate({ id, isActive: !isActive })}
                                title={isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}
                                className='w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:border-destructive/40 hover:text-destructive transition-all'>
                                <Ban className='w-3.5 h-3.5' />
                              </button>
                              {/* Reset password */}
                              <button onClick={() => setResetId(id || null)} title='Đặt lại mật khẩu'
                                className='w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:border-primary/30 hover:text-primary transition-all'>
                                <KeyRound className='w-3.5 h-3.5' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalItems > itemsPerPage && (
              <div className='flex items-center justify-between px-5 py-4 border-t border-border/50 bg-muted/20'>
                <span className='text-xs font-semibold text-muted-foreground'>Trang {page} / {totalPages}</span>
                <div className='flex gap-2'>
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className='px-3 py-1.5 rounded-lg border border-border text-xs font-semibold disabled:opacity-40 hover:border-primary/30'>Trước</button>
                  <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}
                    className='px-3 py-1.5 rounded-lg border border-border text-xs font-semibold disabled:opacity-40 hover:border-primary/30'>Sau</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reset Password Modal */}
      {resetId && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' onClick={() => setResetId(null)}>
          <div className='bg-card rounded-xl p-8 w-full max-w-sm shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center gap-3 mb-6'>
              <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
                <KeyRound className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h3 className='font-heading font-semibold text-foreground'>Đặt lại mật khẩu</h3>
                <p className='text-xs text-muted-foreground'>Nhập mật khẩu mới cho người dùng</p>
              </div>
            </div>
            <input type='password' placeholder='Mật khẩu mới (tối thiểu 8 ký tự)'
              value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              className='w-full border border-border rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-primary/50' />
            <div className='flex gap-3'>
              <button onClick={() => setResetId(null)}
                className='flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all'>Huỷ</button>
              <button onClick={() => resetPwd.mutate({ id: resetId, password: newPwd })}
                disabled={newPwd.length < 8 || resetPwd.isPending}
                className='flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-all'>
                {resetPwd.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
