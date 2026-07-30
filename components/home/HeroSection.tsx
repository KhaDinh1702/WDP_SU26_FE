'use client';


import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { ChevronDown } from 'lucide-react';

export function HeroSection() {
  const router = useRouter();
  const { authUser } = useAuthStore();

  const handleBooking = () => {
    router.push(authUser?.role === 'customer' ? '/booking' : '/register');
  };

  return (
    <section className='relative w-full pt-16 bg-[#0A1628] overflow-hidden'>
      {/* Full-width video */}
      <div className='relative w-full aspect-[16/7] min-h-[480px] md:min-h-[560px] bg-[#0A1628]'>
        <video
          src='/carwash.mp4'
          autoPlay
          loop
          muted
          playsInline
          className='absolute inset-0 w-full h-full object-cover object-center'
        />

        {/* Gradient overlay - fade from left to dark background for readable text */}
        <div className='absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/60 to-transparent' />
        <div className='absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent opacity-80' />

        {/* Text + CTA aligned to the LEFT */}
        <div className='absolute inset-0 flex flex-col items-start justify-center text-left px-6 sm:px-12 md:px-20 max-w-3xl gap-5 z-10'>
          <p className='text-white text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight drop-shadow-md'>
            Xe sạch từng góc nhỏ {' '}
            <br className='hidden sm:inline' />
            <span className='text-sky-400'>Chỉ mất vài phút.</span>
          </p>
          <p className='text-slate-300 text-sm sm:text-base max-w-lg font-medium leading-relaxed drop-shadow-xs'>
            Dịch vụ rửa xe chuyên nghiệp tiêu chuẩn cao cấp. Đặt lịch nhanh, nhận xe đúng giờ, bảo đảm chất lượng.
          </p>
          <div className='flex flex-wrap items-center gap-3 pt-1'>
            <button
              onClick={handleBooking}
              className='inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-sky-500/30 transition-all text-sm cursor-pointer'
            >
              Đặt lịch ngay
            </button>
            <button
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className='inline-flex items-center gap-2 border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-sm backdrop-blur-sm transition-all cursor-pointer'
            >
              Tìm hiểu thêm
              <ChevronDown className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
