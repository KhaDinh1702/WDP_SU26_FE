'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Menu,
  X,
  CalendarCheck,
  Car,
  LogOut,
  ChevronDown,
  User2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTierMeta, getTierLabel } from '@/constants';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { getInitials } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { useLogout } from '@/hooks/auth/useLogout';
import { getMyLoyalty } from '@/lib/customer-api';
import type { LoyaltyAccount } from '@/types/loyalty';

/**
 * Dự phòng khi chưa tải xong GET /me/loyalty. Mốc thật do BE trả về theo hạng
 * qua `washesRequiredForNextVoucher`.
 */
const FALLBACK_WASHES_PER_VOUCHER = 10;

const navLinks = [
  { label: 'Đặt lịch', href: '/booking' },
  { label: 'Hạng thành viên', href: '/#loyalty' },
  { label: 'Liên hệ', href: '/#contact' },
];

export function Navbar() {
  const authUser = useAuthStore((s) => s.authUser);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = useLogout();

  // Lấy dữ liệu loyalty thật (cùng query key với trang loyalty -> dùng chung
  // cache, không gọi API thừa). Điểm và tiến độ rửa lấy từ đây thay vì
  // authUser (vốn chỉ set lúc đăng nhập nên hay lệch / bằng 0).
  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: getMyLoyalty,
    enabled: !!authUser,
  });
  const loyalty: LoyaltyAccount | null =
    loyaltyData?.data?.data ?? loyaltyData?.data ?? null;

  // `tierName` là enum của BE ('None' | 'Bronze' | ...) — chỉ dùng để tra cứu,
  // luôn render qua getTierLabel.
  const tierName = loyalty?.tierName ?? authUser?.tier;
  const tierMeta = getTierMeta(tierName);
  const tierLabel = getTierLabel(tierName);
  const points = loyalty?.pointsBalance ?? authUser?.loyaltyPoints ?? 0;
  const towardVoucher = loyalty?.successfulWashesTowardVoucher ?? 0;
  const washesPerVoucher =
    loyalty?.washesRequiredForNextVoucher ?? FALLBACK_WASHES_PER_VOUCHER;
  const voucherPct = Math.min((towardVoucher / washesPerVoucher) * 100, 100);
  const initials = getInitials(authUser?.name);

  return (
    <nav className='fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <Link
            href='/'
            className='flex items-center gap-2.5 shrink-0'
          >
            <Image
              src='/logo-wave.jpg'
              alt='WAVE'
              width={34}
              height={34}
              className='rounded-full object-cover shadow-sm'
            />
            <span className='font-heading text-foreground font-bold text-2xl tracking-tighter'>
              WAVE
            </span>
          </Link>

          {/* Nav links */}
          <div className='hidden lg:flex items-center gap-1 xl:gap-1.5'>
            {navLinks.map((link, idx) => (
              <div key={link.href} className='flex items-center'>
                {idx > 0 && (
                  <span className='w-px h-3.5 bg-muted-foreground/30 mx-3 xl:mx-4 shrink-0' />
                )}
                <a
                  href={link.href}
                  className='text-foreground/70 hover:text-primary text-sm font-medium transition-colors'
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>

          {/* Right: auth */}
          <div className='hidden md:flex items-center gap-2 sm:gap-4'>
            {authUser ? (
              <div className='flex items-center gap-4'>
                {/* Notification Bell (realtime + lịch sử) */}
                <NotificationBell />

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button className='flex items-center gap-3 group cursor-pointer focus:outline-none hover:bg-accent/30 pl-1.5 pr-4 py-1.5 rounded-full transition-all'>
                      <div
                        className={cn(
                          'relative p-0.5 rounded-full bg-linear-to-br transition-all group-hover:scale-105 active:scale-95',
                          tierMeta.gradientClass,
                        )}
                      >
                        {authUser.avatarUrl ? (
                          <div className='relative w-8 h-8'>
                            <Image
                              src={authUser.avatarUrl}
                              alt={authUser.name}
                              fill
                              className='rounded-full object-cover border-2 border-background'
                            />
                          </div>
                        ) : (
                          <div className='w-8 h-8 rounded-full bg-background flex items-center justify-center border-2 border-background shadow-inner'>
                            <span className='text-primary text-[10px] font-bold tracking-tighter'>
                              {initials}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className='hidden lg:inline text-foreground text-sm font-bold tracking-tight max-w-[10rem] truncate'>
                        {authUser.name}
                      </span>
                      <ChevronDown className='w-4 h-4 text-foreground/30 transition-transform group-data-[state=open]:rotate-180' />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align='end'
                    className='w-[min(90vw,18rem)] p-2 bg-white/95 backdrop-blur-xl border-border/50 text-foreground shadow-2xl rounded-2xl'
                  >
                    <div className='p-4 mb-2 bg-linear-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/10'>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-base font-bold shadow-lg'>
                          {initials}
                        </div>
                        <div className='flex flex-col'>
                          <span className='font-heading font-bold text-lg text-foreground tracking-tight'>
                            {authUser.name}
                          </span>
                          <span className='text-foreground/50 text-xs font-medium'>
                            {authUser.email || 'Thành viên mới'}
                          </span>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.1em] shadow-xs',
                              tierMeta.badgeClass,
                            )}
                          >
                            {tierLabel}
                          </span>
                          <span className='text-primary font-bold text-xs'>
                            {points.toLocaleString()}{' '}
                            <span className='text-foreground/40 font-bold'>
                              PTS
                            </span>
                          </span>
                        </div>
                        {/* Tiến độ rửa tới voucher thưởng (dữ liệu thật) */}
                        <div className='h-1.5 w-full bg-primary/10 rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-linear-to-r from-primary to-secondary transition-all duration-1000 ease-out'
                            style={{ width: `${voucherPct}%` }}
                          />
                        </div>
                        <p className='text-[10px] font-medium text-foreground/50'>
                          {towardVoucher}/{washesPerVoucher} lượt rửa tới voucher
                          thưởng
                        </p>
                      </div>
                    </div>

                    <DropdownMenuSeparator className='bg-border/50 my-1' />

                    <div className='space-y-1'>
                      <DropdownMenuItem
                        onClick={() => router.push('/profile')}
                        className='p-3 rounded-lg cursor-pointer flex items-center gap-3 text-foreground/70 font-bold hover:bg-primary/5 hover:text-primary transition-colors focus:bg-primary/5 focus:text-primary'
                      >
                        <User2 className='w-5 h-5 text-primary' />
                        Tài khoản của tôi
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push('/booking')}
                        className='p-3 rounded-lg cursor-pointer flex items-center gap-3 text-foreground/70 font-bold hover:bg-primary/5 hover:text-primary transition-colors focus:bg-primary/5 focus:text-primary'
                      >
                        <CalendarCheck className='w-5 h-5 text-primary' />
                        Đặt lịch rửa xe
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push('/profile/vehicles')}
                        className='p-3 rounded-lg cursor-pointer flex items-center gap-3 text-foreground/70 font-bold hover:bg-primary/5 hover:text-primary transition-colors focus:bg-primary/5 focus:text-primary'
                      >
                        <Car className='w-5 h-5 text-primary' />
                        Xe của tôi
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className='bg-border/50 my-1' />

                    <DropdownMenuItem
                      onClick={() => handleLogout()}
                      className='p-3 rounded-lg cursor-pointer flex items-center gap-3 text-red-500/80 font-bold hover:bg-red-500/5 hover:text-red-500 transition-colors focus:bg-red-500/5 focus:text-red-500'
                    >
                      <LogOut className='w-5 h-5' />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Button
                  variant='ghost'
                  onClick={() => router.push('/login')}
                  className='text-foreground/70 hover:text-primary hover:bg-primary/5 h-9 px-4 text-sm font-medium'
                >
                  Đăng nhập
                </Button>
                <Button
                  onClick={() => router.push('/register')}
                  className='bg-primary hover:bg-primary/90 text-primary-foreground border-0 h-9 px-5 text-sm rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105'
                >
                  Đăng ký
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className='md:hidden text-foreground p-2 rounded-md hover:bg-accent/60 transition-colors'
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {menuOpen ? (
              <X className='w-5 h-5' />
            ) : (
              <Menu className='w-5 h-5' />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className='md:hidden bg-background border-t border-border px-4 py-4 flex flex-col gap-4 shadow-xl'>
          {authUser && (
            <div className='flex items-center gap-3 pb-3 border-b border-border'>
              <span className='w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold'>
                {initials}
              </span>
              <div>
                <div className='text-foreground text-sm font-medium'>
                  {authUser.name}
                </div>
                <div className='flex items-center gap-1.5 mt-0.5'>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      tierMeta.badgeClass,
                    )}
                  >
                    {tierLabel}
                  </span>
                  <span className='text-foreground/45 text-xs'>
                    {points.toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          )}

          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className='text-foreground/70 hover:text-primary text-sm font-bold py-2'
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <div className='flex gap-3 pt-2 border-t border-border'>
            {authUser ? (
              <Button
                onClick={() => handleLogout()}
                className='flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0 h-9 text-sm'
              >
                Đăng xuất
              </Button>
            ) : (
              <>
                <Button
                  variant='ghost'
                  onClick={() => router.push('/login')}
                  className='text-foreground/80 hover:text-primary hover:bg-primary/5 h-10 flex-1 text-sm font-bold'
                >
                  Đăng nhập
                </Button>
                <Button
                  onClick={() => router.push('/register')}
                  className='bg-primary text-white border-0 h-10 flex-1 text-sm font-bold rounded-full'
                >
                  Đăng ký
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
