import Image from 'next/image';
import {
  CalendarCheck,
  History,
  Car,
  Gift,
  Bell,
  ShieldCheck,
} from 'lucide-react';

const features = [
  {
    icon: CalendarCheck,
    title: 'Đặt lịch trực tuyến',
    desc: 'Chọn ngày, giờ và dịch vụ phù hợp ngay trên web hoặc app. Nhận xác nhận tức thì, không cần gọi điện.',
    color: 'bg-accent text-primary',
  },
  {
    icon: History,
    title: 'Lịch sử rửa xe',
    desc: 'Xem toàn bộ lịch sử các lần rửa xe: thời gian, dịch vụ, chi phí và điểm tích lũy của từng lần.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Car,
    title: 'Quản lý xe cá nhân',
    desc: 'Lưu thông tin nhiều xe, nhận gợi ý dịch vụ phù hợp với từng loại xe và theo dõi tình trạng xe.',
    color: 'bg-accent text-primary',
  },
  {
    icon: Gift,
    title: 'Tích điểm & Đổi thưởng',
    desc: 'Mỗi lần rửa xe tích điểm loyalty. Đổi điểm lấy giảm giá, rửa xe miễn phí hoặc dịch vụ bổ sung.',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    icon: Bell,
    title: 'Thông báo thời gian thực',
    desc: 'Nhận thông báo khi xe được nhận, đang rửa và sẵn sàng. Không cần ngồi đợi mà vẫn nắm tiến độ.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo đảm chất lượng',
    desc: 'Cam kết hoàn tiền hoặc rửa lại miễn phí nếu không đạt tiêu chuẩn. Chất lượng luôn được đặt lên hàng đầu.',
    color: 'bg-rose-50 text-rose-600',
  },
];

export function FeaturesSection() {
  return (
    <section
      id='services'
      className='py-12 sm:py-16 bg-background px-4 relative overflow-hidden'
    >
      <div className='max-w-7xl mx-auto relative z-10'>
        <div className='text-center mb-12 sm:mb-16 lg:mb-20'>
          <div className='inline-flex items-center gap-2 bg-primary/10 text-primary text-[10px] font-semibold px-4 py-2 rounded-full mb-6 uppercase tracking-[0.2em] animate-fade-in-up'>
            <ShieldCheck className='w-4 h-4' />
            Platform Excellence
          </div>
          <h1 className='text-[1.75rem] sm:text-4xl lg:text-5xl font-heading text-foreground leading-[1.15] mb-4 animate-fade-in-up [animation-delay:200ms] opacity-0 fill-mode-forwards'>
            Giải pháp{' '}
            <span className='bg-linear-to-r from-primary via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
              toàn diện
            </span>
          </h1>
          <p className='text-foreground/50 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl font-medium leading-relaxed animate-fade-in-up [animation-delay:400ms] opacity-0 fill-mode-forwards'>
            Tích hợp công nghệ AI và quy trình tự động hóa để mang lại trải
            nghiệm chăm sóc xe mượt mà nhất cho bạn.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 md:grid-rows-2 gap-4 sm:gap-6 h-auto lg:h-[700px]'>
          {/* Main Feature - Large Card */}
          <div className='md:col-span-2 lg:col-span-2 lg:row-span-2 bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-2xl shadow-primary/5 border border-border/50 flex flex-col justify-between group hover:-translate-y-2 transition-all duration-500 animate-fade-in-up [animation-delay:500ms] opacity-0 fill-mode-forwards'>
            <div>
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform'>
                  <CalendarCheck className='w-8 h-8' />
                </div>
                <h3 className='font-heading text-2xl sm:text-3xl font-semibold text-foreground mb-4'>
                  {features[0].title}
                </h3>
              </div>
              <p className='text-foreground/50 text-lg leading-relaxed'>
                {features[0].desc}
              </p>
            </div>
            <div className='flex-1 min-h-[20rem] rounded-2xl border border-primary/5 relative overflow-hidden'>
              <Image
                fill
                sizes='(max-width: 1024px) 100vw, 50vw'
                src='/feature-booking.png'
                alt='Đặt lịch trực tuyến'
                className='object-contain object-bottom p-4'
              />
            </div>
          </div>

          {/* Medium Card - Right Top */}
          <div className='lg:col-span-2 bg-primary rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-2xl shadow-primary/20 flex flex-col justify-end text-white group hover:-translate-y-2 transition-all duration-500 animate-fade-in-up [animation-delay:600ms] opacity-0 fill-mode-forwards relative overflow-hidden min-h-[20rem]'>
            <div className='absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20' />
            <div className='absolute -top-4 right-0 w-[58%] h-[55%] pointer-events-none'>
              <Image
                fill
                sizes='(max-width: 1024px) 100vw, 50vw'
                src='/feature-cars.png'
                alt='Quản lý xe cá nhân'
                className='object-contain object-right-top mt-6 drop-shadow-2xl'
              />
            </div>
            <div className='relative z-10 max-w-full'>
              <div className='flex items-center gap-4'>
                <div className='w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <Car className='w-7 h-7' />
                </div>
                <h3 className='font-heading text-2xl lg:text-3xl font-semibold mb-3'>
                  {features[2].title}
                </h3>
              </div>
              <p className='text-white/80 text-sm lg:text-base leading-relaxed max-w-md'>
                {features[2].desc}
              </p>
            </div>
          </div>

          {/* Small Cards - Bottom */}
          <div className='bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-primary/5 border border-border/50 group hover:-translate-y-2 transition-all duration-500 animate-fade-in-up [animation-delay:700ms] opacity-0 fill-mode-forwards relative overflow-hidden flex flex-col'>
            <div className='flex items-center gap-4 mb-4'>
              <div className='w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform'>
                <History className='w-6 h-6' />
              </div>
              <h3 className='font-heading text-lg font-semibold text-foreground'>
                {features[1].title}
              </h3>
            </div>
            <p className='text-foreground/50 text-xs leading-relaxed text-justify'>
              {features[1].desc}
            </p>
            <div className='relative mt-4 w-full h-32'>
              <Image
                fill
                sizes='(max-width: 1024px) 100vw, 50vw'
                src='/feature-history.png'
                alt='Lịch sử rửa xe'
                className='object-contain object-bottom'
              />
            </div>
          </div>

          <div className='bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-primary/5 border border-border/50 group hover:-translate-y-2 transition-all duration-500 animate-fade-in-up [animation-delay:800ms] opacity-0 fill-mode-forwards relative overflow-hidden flex flex-col'>
            <div className='flex items-center gap-4 mb-4'>
              <div className='w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform'>
                <Gift className='w-6 h-6' />
              </div>
              <h3 className='font-heading text-lg font-semibold text-foreground '>
                {features[3].title}
              </h3>
            </div>
            <p className='text-foreground/50 text-xs leading-relaxed text-justify'>
              {features[3].desc}
            </p>
            <div className='relative mt-4 w-full h-32'>
              <Image
                fill
                sizes='(max-width: 1024px) 100vw, 50vw'
                src='/feature-rewards.png'
                alt='Tích điểm & Đổi thưởng'
                className='object-contain object-bottom'
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
