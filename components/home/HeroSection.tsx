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
    <section className='w-full pt-24 pb-12 lg:pt-32 lg:pb-20 bg-white overflow-hidden'>
      <div className='max-w-7xl mx-auto px-6 sm:px-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-16'>
        {/* Text Area */}
        <div className='w-full lg:w-[45%] flex flex-col items-start justify-center text-left gap-6 z-10 shrink-0'>
          <h2 className='font-heading text-[1.75rem] sm:text-4xl lg:text-5xl text-foreground leading-tight tracking-tight'>
            Xe sạch từng góc nhỏ {' '}
            <br className='hidden sm:inline' />
            <span className='bg-linear-to-r from-primary via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>Chỉ mất vài phút.</span>
          </h2>
          <p className='text-slate-600 text-base lg:text-lg max-w-lg font-medium leading-relaxed'>
            Dịch vụ rửa xe chuyên nghiệp tiêu chuẩn cao cấp. Đặt lịch nhanh, nhận xe đúng giờ, bảo đảm chất lượng.
          </p>
          <div className='flex flex-wrap items-center gap-4 pt-2'>
            <button
              onClick={handleBooking}
              className='inline-flex items-center gap-2 bg-primary hover:bg-sky-400 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all text-sm cursor-pointer'
            >
              Đặt lịch ngay
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className='w-full lg:w-[55%] relative z-10'>
          <div className='relative w-full aspect-[16/10] sm:aspect-video rounded-3xl overflow-hidden border-8 border-slate-50 shadow-2xl ring-1 ring-slate-200/50 bg-slate-100'>
            <video
              src='/carwash.mp4'
              autoPlay
              loop
              muted
              playsInline
              className='w-full h-full object-cover object-center'
            />
          </div>
          {/* Decorative background blob */}
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-tr from-sky-100 to-blue-50 rounded-full blur-3xl -z-10 opacity-70' />
        </div>
      </div>
    </section>
  );
}
