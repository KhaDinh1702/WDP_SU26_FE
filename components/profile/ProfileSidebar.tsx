'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/format';
import {
  User,
  Bell,
  Ticket,
  Star,
  Car,
  History,
  CalendarClock,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar nhóm theo tác vụ: tiêu đề nhóm KHÔNG bấm được, item luôn là link.
 * Active tính theo prefix dài nhất khớp pathname để trang con
 * (/profile/orders/[id], /profile/loyalty/transactions) vẫn sáng đúng mục.
 */
const menuGroups: {
  heading: string;
  items: { label: string; href: string; icon: typeof User }[];
}[] = [
  {
    heading: 'Tài khoản',
    items: [
      { label: 'Hồ sơ cá nhân', href: '/profile', icon: User },
      { label: 'Xe của tôi', href: '/profile/vehicles', icon: Car },
    ],
  },
  {
    heading: 'Lịch rửa xe',
    items: [
      { label: 'Lịch sử rửa xe', href: '/profile/orders', icon: CalendarClock },
    ],
  },
  {
    heading: 'Ưu đãi',
    items: [
      { label: 'Hạng thành viên', href: '/profile/loyalty', icon: Star },
      {
        label: 'Lịch sử điểm thưởng',
        href: '/profile/loyalty/transactions',
        icon: History,
      },
      { label: 'Voucher của tôi', href: '/profile/my-voucher', icon: Ticket },
    ],
  },
  {
    heading: 'Khác',
    items: [
      { label: 'Thông báo', href: '/profile/notifications', icon: Bell },
    ],
  },
];

export default function ProfileSidebar() {
  const authUser = useAuthStore((s) => s.authUser);
  const pathname = usePathname();

  const initials = getInitials(authUser?.name);

  // Item active = href là prefix dài nhất của pathname trong toàn bộ menu.
  const allHrefs = menuGroups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const activeItem = menuGroups
    .flatMap((group) => group.items)
    .find((item) => item.href === activeHref) ?? menuGroups[0].items[0];
  const ActiveIcon = activeItem.icon;

  const userSummary = (
    <div className='flex min-w-0 items-center gap-3'>
      <div className='flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/10 bg-primary/10 font-bold text-primary'>
        {authUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authUser.avatarUrl}
            alt={authUser.name}
            className='h-full w-full object-cover'
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className='flex min-w-0 flex-col'>
        <span className='truncate font-heading font-bold capitalize text-foreground'>
          {authUser?.name || 'Người dùng'}
        </span>
        <Link
          href='/profile'
          className='text-xs font-semibold text-primary underline-offset-2 hover:underline'
        >
          Xem hồ sơ
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: giữ điều hướng gọn thay vì đẩy nội dung xuống gần một màn hình. */}
      <div className='overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_12px_35px_-28px_rgba(30,58,138,0.45)] md:hidden'>
        <div className='p-4'>{userSummary}</div>
        <details className='group border-t border-border/60'>
          <summary className='flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden'>
            <span className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <ActiveIcon className='size-4' />
            </span>
            <span className='min-w-0 flex-1 truncate'>{activeItem.label}</span>
            <span className='text-xs font-medium text-muted-foreground'>
              Chuyển mục
            </span>
            <ChevronDown className='size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180' />
          </summary>
          <nav className='grid gap-1 px-2 pb-2' aria-label='Menu tài khoản di động'>
            {menuGroups.flatMap((group) =>
              group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                      isActive
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className='size-4 shrink-0' />
                    {item.label}
                  </Link>
                );
              }),
            )}
          </nav>
        </details>
      </div>

      {/* Desktop sidebar */}
      <div className='hidden flex-col gap-6 md:flex'>
        <div className='px-2'>{userSummary}</div>
        <nav className='space-y-5' aria-label='Menu tài khoản'>
          {menuGroups.map((group) => (
            <div key={group.heading}>
              <p className='mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-placeholder select-none'>
                {group.heading}
              </p>
              <ul className='space-y-0.5'>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                          isActive
                            ? 'bg-primary/10 font-bold text-primary'
                            : 'font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            isActive ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
