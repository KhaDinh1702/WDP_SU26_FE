import {
    LayoutDashboard,
    CalendarCheck,
    Wrench,
    Car,
    Clock,
    Ticket,
    CreditCard,
    ClipboardList,
    Users,
    Layers,
    Crown,
    Settings,
    Bot,
    Eye,
    Star,
} from 'lucide-react';

// Mọi role dùng chung hệ màu thương hiệu (primary) — phân biệt role bằng
// nhãn chữ, không đổi palette theo role để giữ nhận diện nhất quán.
export const SIDEBAR_CONFIG = {
    admin: {
        title: 'Admin',
        textColor: 'text-primary',
        activeClass: 'bg-primary text-primary-foreground',
        avatarClass: 'bg-primary',
        navItems: [
            { href: '/admin', icon: LayoutDashboard, label: 'Tổng quan' },
            { href: '/admin/bookings', icon: CalendarCheck, label: 'Đặt lịch' },
            { href: '/admin/users', icon: Users, label: 'Người dùng' },
            { href: '/admin/vehicles', icon: Car, label: 'Phương tiện' },
            { href: '/admin/services', icon: Layers, label: 'Dịch vụ' },
            { href: '/admin/orders', icon: CreditCard, label: 'Hóa đơn' },
            { href: '/admin/shifts', icon: Clock, label: 'Ca làm việc' },
            { href: '/admin/washers', icon: Eye, label: 'Giám sát thợ rửa' },
            { href: '/admin/tiers', icon: Crown, label: 'Hạng thành viên' },
            { href: '/admin/vouchers', icon: Ticket, label: 'Voucher' },
            { href: '/admin/chat-knowledge', icon: Bot, label: 'Huấn luyện AI' },
            { href: '/admin/settings', icon: Settings, label: 'Cài đặt' },
        ],
    },

    manager: {
        title: 'Manager',
        textColor: 'text-primary',
        activeClass: 'bg-primary text-primary-foreground',
        avatarClass: 'bg-primary',
        navItems: [
            { href: '/manager', icon: LayoutDashboard, label: 'Tổng quan & Báo cáo' },
            { href: '/manager/orders', icon: CalendarCheck, label: 'Đơn đặt lịch' },
            { href: '/manager/work-orders', icon: Wrench, label: 'Vận hành rửa xe' },
            { href: '/manager/washers', icon: Eye, label: 'Giám sát thợ rửa' },
            { href: '/manager/vehicles', icon: Car, label: 'Quản lý xe' },
            { href: '/manager/shifts', icon: Clock, label: 'Ca làm việc' },
            { href: '/manager/vouchers', icon: Ticket, label: 'Voucher' },
            { href: '/manager/chat-knowledge', icon: Bot, label: 'Huấn luyện AI' },
        ],
    },

    cashier: {
        title: 'Cashier',
        textColor: 'text-primary',
        activeClass: 'bg-primary text-primary-foreground',
        avatarClass: 'bg-primary',
        navItems: [
            { href: '/cashier', icon: CreditCard, label: 'Quầy thu ngân' },
            { href: '/cashier/orders', icon: CalendarCheck, label: 'Lịch hẹn đặt trước' },
            { href: '/cashier/work-orders', icon: ClipboardList, label: 'Vận hành rửa xe' },
        ],
    },

    washer: {
        title: 'Washer',
        textColor: 'text-primary',
        activeClass: 'bg-primary text-primary-foreground',
        avatarClass: 'bg-primary',
        navItems: [
            { href: '/washer', icon: Wrench, label: 'Lịch rửa xe' },
            { href: '/washer/feedback', icon: Star, label: 'Đánh giá của tôi' },
        ],
    },
} as const;