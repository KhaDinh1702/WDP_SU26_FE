'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ChevronLeft, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { axiosInstance } from '@/lib/axios';
import { AccountDialog } from '@/components/profile/AccountDialog';
import { SIDEBAR_CONFIG } from './sidebar-config';

type Props = {
  role: keyof typeof SIDEBAR_CONFIG;
};

export function AppSidebar({ role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { setAccessToken, setUser, authUser } = useAuthStore();
  const config = SIDEBAR_CONFIG[role];

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      setUser(null);
      router.replace('/login');
    }
  };

  const initials =
    authUser?.name
      ?.split(' ')
      .map((w: string) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase() ?? 'M';

  return (
    <aside
      className={`sticky top-0 z-30 h-screen self-start flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0 border-r border-sidebar-border ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className='relative flex items-center gap-2 px-4 py-5 border-b border-sidebar-border'>
        <Image
          src='/logo-wave.jpg'
          alt='WAVE'
          width={34}
          height={34}
          className='rounded-full object-cover shrink-0'
        />
        {!collapsed && (
          <span className='font-heading text-sidebar-foreground font-bold text-lg tracking-tight truncate'>
            WAVE{' '}
            <span
              className={`${config.textColor} text-[11px] font-semibold ml-1 uppercase tracking-[0.08em]`}
            >
              {config.title}
            </span>
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          className='absolute -right-3 top-6 z-50 h-7 w-7 rounded-full border border-border bg-card shadow-xs flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors'
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform duration-300 ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Nav Items */}
      <nav className='flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto'>
        {config.navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                isActive
                  ? config.activeClass
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className='w-5 h-5 shrink-0' />
              {!collapsed && (
                <span
                  className={`text-sm truncate ${
                    isActive ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile info + Logout */}
      <div className='px-3 py-4 border-t border-sidebar-border flex flex-col gap-2'>
        {!collapsed && authUser && (
          <button
            type='button'
            onClick={() => setAccountOpen(true)}
            title='Sửa hồ sơ của tôi'
            className='flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent w-full text-left group hover:ring-1 hover:ring-border transition-shadow'
          >
            <div
              className={`w-8 h-8 rounded-full ${config.avatarClass} flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0`}
            >
              {initials}
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-sidebar-foreground truncate'>
                {authUser.name}
              </p>
              <p className='text-xs text-muted-foreground truncate'>
                {authUser.email}
              </p>
            </div>
            <Pencil className='w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity' />
          </button>
        )}
        <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />

        <button
          onClick={handleLogout}
          className='flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full text-left'
        >
          <LogOut className='w-5 h-5 shrink-0' />
          {!collapsed && (
            <span className='text-sm font-medium'>Đăng xuất</span>
          )}
        </button>
      </div>
    </aside>
  );
}
