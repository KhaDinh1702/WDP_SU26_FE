'use client';

import { Crown, Coins, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoyaltyAccount } from '@/types/loyalty';

export const tierStyles: Record<
  string,
  {
    label: string;
    gradient: string;
    text: string;
    border: string;
    glow: string;
    badgeBg: string;
    chipBg: string;
  }
> = {
  none: {
    label: 'Thành viên',
    gradient: 'from-slate-600 via-slate-700 to-slate-900',
    text: 'text-slate-100',
    border: 'border-slate-500/40',
    glow: 'shadow-slate-950/20',
    badgeBg: 'bg-slate-950/20 text-slate-100 border-white/20',
    chipBg: 'bg-white/10',
  },
  member: {
    label: 'Thành viên',
    gradient: 'from-slate-600 via-slate-700 to-slate-900',
    text: 'text-slate-100',
    border: 'border-slate-500/40',
    glow: 'shadow-slate-950/20',
    badgeBg: 'bg-slate-950/20 text-slate-100 border-white/20',
    chipBg: 'bg-white/10',
  },
  bronze: {
    label: 'Đồng',
    gradient: 'from-[#9A6A4A] via-[#795039] to-[#4B3128]',
    text: 'text-orange-50',
    border: 'border-[#8B6046]/50',
    glow: 'shadow-[#5B3928]/25',
    badgeBg: 'bg-[#4B3128]/35 text-orange-50 border-orange-100/25',
    chipBg: 'bg-orange-50/10',
  },
  silver: {
    label: 'Bạc',
    gradient: 'from-slate-400 via-slate-500 to-slate-700',
    text: 'text-slate-100',
    border: 'border-slate-400/50',
    glow: 'shadow-slate-700/20',
    badgeBg: 'bg-slate-700/30 text-white border-white/25',
    chipBg: 'bg-white/10',
  },
  gold: {
    label: 'Vàng',
    gradient: 'from-[#C69332] via-[#9D6E1F] to-[#5C421C]',
    text: 'text-amber-100',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-800/25',
    badgeBg: 'bg-amber-950/25 text-amber-50 border-amber-100/25',
    chipBg: 'bg-amber-50/10',
  },
};

export function getTierLabel(tierName?: string): string {
  const key = (tierName ?? 'none').toLowerCase();
  return tierStyles[key]?.label ?? tierName ?? tierStyles.none.label;
}

export default function LoyaltyCard({
  loyalty,
}: {
  loyalty: LoyaltyAccount | null;
}) {
  const authUser = useAuthStore((s) => s.authUser);
  const currentTierName = (loyalty?.tierName ?? 'None').toLowerCase();
  const currentStyle = tierStyles[currentTierName] || tierStyles.none;

  return (
    <div
      className={`group relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border bg-linear-to-br p-6 text-white shadow-[0_24px_55px_-32px_rgba(30,41,59,0.75)] transition-transform duration-300 hover:-translate-y-0.5 ${currentStyle.gradient} ${currentStyle.glow} ${currentStyle.border}`}
      aria-label={`Thẻ hội viên hạng ${currentStyle.label}`}
    >
      {/* Background elements */}
      <div className='absolute -right-10 -top-10 -z-10 size-40 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-125' />
      <div className='absolute -bottom-8 left-1/3 -z-10 h-24 w-48 rounded-full bg-white/5 blur-xl' />
      <div className='absolute inset-0 -z-10 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.24)_1px,transparent_0)] [background-size:18px_18px]' />

      {/* Card Header */}
      <div className='z-10 flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-[10px] font-semibold uppercase tracking-widest text-white/60'>
            E-Membership Card
          </p>
          <h3 className='font-heading font-semibold tracking-wider text-lg'>
            WASH AUTO
          </h3>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md ${currentStyle.badgeBg}`}
        >
          <Crown className='size-3.5' /> {currentStyle.label}
        </div>
      </div>

      {/* Card Body with EMV Chip Design */}
      <div className='z-10 my-4 flex items-center gap-4'>
        <div
          className={`w-11 h-9 rounded-md ${currentStyle.chipBg} border border-white/20 relative overflow-hidden flex flex-col justify-around p-1`}
        >
          <div className='h-[1px] bg-white/20 w-full' />
          <div className='h-[1px] bg-white/20 w-full' />
          <div className='h-[1px] bg-white/20 w-full' />
        </div>
        <div>
          <p className='text-xs font-medium text-white/70'>Tên chủ thẻ</p>
          <p className='font-bold uppercase tracking-wider text-sm sm:text-base'>
            {authUser?.name || 'KHÁCH HÀNG'}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className='z-10 grid grid-cols-2 gap-4 border-t border-white/20 pt-4'>
        <div>
          <p className='text-[9px] font-semibold uppercase tracking-widest text-white/50 flex items-center gap-1'>
            <Coins className='size-3' /> Điểm tích lũy
          </p>
          <p className='text-lg font-semibold tracking-wide'>
            {(loyalty?.pointsBalance ?? 0).toLocaleString()}{' '}
            <span className='text-xs font-semibold text-white/70'>PTS</span>
          </p>
        </div>
        <div className='text-right'>
          <p className='text-[9px] font-semibold uppercase tracking-widest text-white/50 flex items-center gap-1 justify-end'>
            <Sparkles className='size-3' /> Lượt rửa hoàn tất
          </p>
          <p className='text-lg font-semibold tracking-wide'>
            {(loyalty?.totalSuccessfulWashes ?? 0).toLocaleString()}{' '}
            <span className='text-xs font-semibold text-white/70'>lần</span>
          </p>
        </div>
      </div>
    </div>
  );
}
