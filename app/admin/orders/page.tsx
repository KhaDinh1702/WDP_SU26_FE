'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { adminGetOrders } from '@/lib/admin-api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface OrderData {
  _id?: string;
  id?: string;
  userId?: { fullName?: string };
  customerName?: string;
  amount?: number | string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => adminGetOrders({ page, limit: 10 }),
  });

  const orders: OrderData[] = data?.data?.data ?? data?.data ?? [];
  const total: number = data?.data?.total ?? orders.length;

  const filtered = search
    ? orders.filter((o: OrderData) => JSON.stringify(o).toLowerCase().includes(search.toLowerCase()))
    : orders;

  const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Đã thanh toán', cls: 'bg-success/10 text-success' },
    unpaid:  { label: 'Chưa thanh toán', cls: 'bg-yellow-50 text-yellow-700' },
    refunded:{ label: 'Hoàn tiền', cls: 'bg-destructive/10 text-destructive' },
  };

  return (
    <>
      <AdminTopbar title='Quản lý hóa đơn' subtitle='Lịch sử giao dịch và thanh toán' />
      <main className='flex-1 p-8 overflow-y-auto'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex flex-wrap items-center gap-3 mb-6'>
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-placeholder' />
              <input type='text' placeholder='Tìm kiếm hóa đơn...' value={search} onChange={(e) => setSearch(e.target.value)}
                className='w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-all' />
            </div>
            <button onClick={() => refetch()} className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold hover:border-primary/30'>
              <RefreshCw className='w-4 h-4 text-foreground/50' />Làm mới
            </button>
            <span className='ml-auto text-xs font-semibold text-foreground/60'>Tổng: {total} hóa đơn</span>
          </div>

          <div className='bg-card rounded-xl border border-border/50 shadow-xs overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-muted/50 border-b border-border/50'>
                    {['ID', 'Khách hàng', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày tạo'].map((h) => (
                      <th key={h} className='text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-foreground/60'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/30'>
                  {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className='px-5 py-4'><div className='h-4 bg-muted animate-pulse rounded-lg' /></td>
                    ))}</tr>
                  )) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className='px-5 py-16 text-center text-foreground/60 font-semibold'>Không có dữ liệu</td></tr>
                  ) : filtered.map((o: OrderData) => {
                    const id = o._id ?? o.id ?? '';
                    const ps = paymentStatusConfig[o.paymentStatus ?? 'unpaid'] ?? paymentStatusConfig.unpaid;
                    return (
                      <tr key={id} className='hover:bg-muted/20 transition-colors'>
                        <td className='px-5 py-4 font-mono text-xs text-foreground/50'>{id.slice(-6).toUpperCase()}</td>
                        <td className='px-5 py-4 font-semibold text-foreground'>{o.userId?.fullName ?? o.customerName ?? '-'}</td>
                        <td className='px-5 py-4 font-semibold text-foreground'>{o.amount != null ? `${Number(o.amount).toLocaleString('vi-VN')}đ` : '-'}</td>
                        <td className='px-5 py-4 text-foreground/60 capitalize'>{o.paymentMethod ?? '-'}</td>
                        <td className='px-5 py-4'>
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${ps.cls}`}>{ps.label}</span>
                        </td>
                        <td className='px-5 py-4 text-foreground/50 text-xs'>
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {total > 10 && (
              <div className='flex items-center justify-between px-5 py-4 border-t border-border/50 bg-muted/20'>
                <span className='text-xs font-semibold text-foreground/60'>Trang {page} / {Math.ceil(total / 10)}</span>
                <div className='flex gap-2'>
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className='px-3 py-1.5 rounded-lg border border-border text-xs font-semibold disabled:opacity-40 hover:border-primary/30'>Trước</button>
                  <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 10)}
                    className='px-3 py-1.5 rounded-lg border border-border text-xs font-semibold disabled:opacity-40 hover:border-primary/30'>Sau</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
