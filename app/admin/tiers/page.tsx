'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { adminGetTierConfigs, adminUpdateTierConfig, adminToggleTierConfig } from '@/lib/admin-api';
import { getTierLabel } from '@/constants/tiers';
import type { TierConfig } from '@/types/loyalty';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Crown, Pencil, Power, X } from 'lucide-react';

// Field names must match the API payload exactly (`tierName`, `minLoyaltyPoints`,
// …). An earlier local type here invented `name`/`minPoints`/`benefits`, which
// read as undefined on every card — every tier rendered nameless with "0 điểm" —
// and the edit form POSTed keys the BE DTO ignores, so saving silently did
// nothing. Use the shared TierConfig type so the two can't drift again.
const tierColors: Record<string, string> = {
  none:   'from-slate-500 to-slate-400',
  bronze: 'from-amber-700 to-amber-500',
  silver: 'from-slate-500 to-slate-400',
  gold:   'from-yellow-500 to-yellow-400',
};

/** Only fields UpdateTierConfigDto actually accepts. */
const EDITABLE = [
  { key: 'minLoyaltyPoints', label: 'Điểm tối thiểu', step: 1 },
  { key: 'discountPercent', label: 'Giảm giá (%)', step: 0.5 },
  { key: 'bookingWindowDays', label: 'Được đặt lịch trước (ngày)', step: 1 },
  { key: 'pointsPer1000Vnd', label: 'Điểm trên mỗi 1.000đ', step: 0.5 },
] as const;

function TierModal({ item, onClose, onSave }: { item: TierConfig; onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [form, setForm] = useState<Record<string, number>>(() =>
    Object.fromEntries(EDITABLE.map((f) => [f.key, Number(item[f.key] ?? 0)])),
  );
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' onClick={onClose}>
      <div className='bg-card rounded-xl p-8 w-full max-w-md shadow-2xl' onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='font-heading font-semibold text-foreground text-lg'>Sửa hạng: {getTierLabel(item.tierName)}</h3>
          <button onClick={onClose}><X className='w-5 h-5 text-foreground/60' /></button>
        </div>
        <div className='flex flex-col gap-4'>
          {EDITABLE.map((f) => (
            <div key={f.key}>
              <label className='block text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-1.5'>{f.label}</label>
              <input type='number' step={f.step} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                className='w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50' />
            </div>
          ))}
        </div>
        <div className='flex gap-3 mt-6'>
          <button onClick={onClose} className='flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted'>Huỷ</button>
          <button onClick={() => onSave(form)}
            className='flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90'>Lưu</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTiersPage() {
  const qc = useQueryClient();
  const [editTier, setEditTier] = useState<TierConfig | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-tiers'], queryFn: adminGetTierConfigs });
  const tiers: TierConfig[] = data?.data?.data ?? data?.data ?? [];

  const updateTier = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => adminUpdateTierConfig(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tiers'] }); setEditTier(null); } });
  const toggleTier = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminToggleTierConfig(id, isActive), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tiers'] }) });

  return (
    <>
      <AdminTopbar title='Hạng thành viên' subtitle='Cấu hình chương trình loyalty và đặc quyền' />
      <main className='flex-1 p-8 overflow-y-auto'>
        <div className='max-w-5xl mx-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className='h-64 bg-card rounded-xl border border-border animate-pulse' />) :
              tiers.length === 0 ? (
                <div className='col-span-4 py-16 text-center text-foreground/60 font-semibold bg-card rounded-xl border border-border/50'>
                  Chưa có cấu hình hạng
                </div>
              ) : tiers.map((t) => {
                const id = t.id;
                const gradient = tierColors[(t.tierName ?? '').toLowerCase()] ?? 'from-primary to-secondary';
                return (
                  <div key={id} className='bg-card rounded-xl border border-border/50 shadow-xs overflow-hidden hover:-translate-y-1 transition-all'>
                    {/* Header gradient */}
                    <div className={`bg-linear-to-br ${gradient} p-6 text-white relative overflow-hidden`}>
                      <div className='absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mr-8 -mt-8' />
                      <Crown className='w-8 h-8 mb-3 relative z-10' />
                      <h3 className='font-heading font-semibold text-xl capitalize relative z-10'>{getTierLabel(t.tierName)}</h3>
                      <span className={`mt-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${t.isActive !== false ? 'bg-white/20' : 'bg-black/20'} relative z-10`}>
                        {t.isActive !== false ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className='p-5 flex flex-col gap-3'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-foreground/50'>Điểm tối thiểu</span>
                        <span className='font-semibold text-foreground'>{(t.minLoyaltyPoints ?? 0).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-foreground/50'>Giảm giá</span>
                        <span className='font-semibold text-primary'>{t.discountPercent ?? 0}%</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-foreground/50'>Đặt lịch trước</span>
                        <span className='font-semibold text-foreground'>{t.bookingWindowDays ?? 0} ngày</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-foreground/50'>Điểm / 1.000đ</span>
                        <span className='font-semibold text-foreground'>{t.pointsPer1000Vnd ?? 0}</span>
                      </div>
                      <div className='flex gap-2 mt-2 pt-3 border-t border-border/50'>
                        <button onClick={() => setEditTier(t)}
                          className='flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-semibold hover:border-primary/30 hover:text-primary transition-all'>
                          <Pencil className='w-3.5 h-3.5' />Sửa
                        </button>
                        <button onClick={() => toggleTier.mutate({ id, isActive: !(t.isActive !== false) })}
                          className='flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-semibold hover:border-yellow-300 hover:text-yellow-600 transition-all'>
                          <Power className='w-3.5 h-3.5' />{t.isActive !== false ? 'Tắt' : 'Bật'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </main>

      {editTier && <TierModal item={editTier} onClose={() => setEditTier(null)} onSave={(d) => updateTier.mutate({ id: editTier.id, data: d })} />}
    </>
  );
}
