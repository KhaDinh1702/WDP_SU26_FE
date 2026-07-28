'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';

const STATS = [
  { value: '5,000+', label: 'Lượt rửa xe' },
  { value: '98%', label: 'Hài lòng' },
  { value: '3 năm', label: 'Kinh nghiệm' },
  { value: '24/7', label: 'Hỗ trợ' },
];

const CHECKLIST = [
  'Máy rửa xe chuyên nghiệp nhập khẩu',
  'Hóa chất sinh học, an toàn cho sơn xe',
  'Đội ngũ kỹ thuật viên được chứng nhận',
  'Cam kết hài lòng 100% hoặc hoàn tiền',
];

export function AboutSection() {
  return (
    <section id='about' className='py-8 sm:py-16 bg-background'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>

        {/* Header */}
        <div className='mb-8 sm:mb-12'>
          <p className='text-xs uppercase font-bold tracking-[0.3em] text-primary mb-3'>
            Về chúng tôi
          </p>
          <h2 className='font-heading text-[1.75rem] sm:text-4xl lg:text-5xl text-foreground leading-tight tracking-tight'>
            Câu chuyện <span className='text-primary'>WAVE</span>
          </h2>
        </div>

        {/* Main Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center'>

          {/* Left: Images stacked */}
          <div className='relative'>
            {/* Main car image */}
            <div className='rounded-3xl overflow-hidden border border-border/50 shadow-xl aspect-[4/3]'>
              <Image
                src='/about-car.png'
                alt='Xe sạch sau khi rửa chuyên nghiệp'
                fill
                className='object-cover hover:scale-105 transition-transform duration-700'
              />
            </div>
            {/* Worker thumbnail overlay */}
            <div className='absolute -bottom-6 -right-4 sm:-right-8 w-32 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden border-4 border-background shadow-2xl'>
              <Image
                src='/about-worker.png'
                alt='Nhân viên rửa xe chuyên nghiệp'
                fill
                className='object-cover'
              />
            </div>
            {/* Floating stat badge */}
            <div className='absolute top-4 -left-4 sm:-left-8 bg-card border border-border rounded-2xl px-4 py-3 shadow-xl'>
              <p className='text-2xl font-extrabold text-primary leading-none'>98%</p>
              <p className='text-[11px] text-muted-foreground font-semibold mt-0.5'>Khách hàng hài lòng</p>
            </div>
          </div>

          {/* Right: Content */}
          <div className='flex flex-col gap-8 pb-6'>
            <div className='space-y-4'>
              <h3 className='text-xl sm:text-2xl font-bold text-foreground'>
                Rửa xe chuyên nghiệp — tiêu chuẩn quốc tế
              </h3>
              <p className='text-muted-foreground text-base leading-relaxed'>
                WAVE là nền tảng đặt lịch rửa xe thông minh, kết hợp công nghệ hiện đại
                và đội ngũ kỹ thuật viên được đào tạo bài bản. Chúng tôi cam kết mang lại
                dịch vụ chăm sóc xe chất lượng cao nhất với chi phí hợp lý nhất.
              </p>
            </div>

            {/* Checklist */}
            <ul className='space-y-3'>
              {CHECKLIST.map((item) => (
                <li key={item} className='flex items-center gap-3'>
                  <span className='w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0'>
                    <Check className='w-3 h-3 text-primary' />
                  </span>
                  <span className='text-sm font-medium text-foreground/80'>{item}</span>
                </li>
              ))}
            </ul>

            {/* Stats row */}
            <div className='grid grid-cols-4 gap-4 pt-2 border-t border-border'>
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className='text-xl sm:text-2xl font-extrabold text-primary'>{s.value}</p>
                  <p className='text-[11px] text-muted-foreground font-semibold mt-0.5'>{s.label}</p>
                </div>
              ))}
            </div>

            <a
              href='#services'
              className='inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 w-fit'
            >
              Xem dịch vụ
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
