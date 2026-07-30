'use client';

import Image from 'next/image';

export function ShowcaseSection() {
  return (
    <section className='py-12 sm:py-16 px-4 relative overflow-hidden reveal-on-scroll bg-[radial-gradient(ellipse_at_top,var(--primary)/8_0%,transparent_55%),linear-gradient(180deg,var(--background)_0%,color-mix(in_oklab,var(--primary)_6%,var(--background))_100%)]'>
      <div className='absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-primary/30 to-transparent' />
      <div className='absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-fuchsia-400/30 to-transparent' />
      <div className='max-w-7xl mx-auto relative z-10'>
        <div className='text-center mb-12 sm:mb-16 lg:mb-20'>
          <h1 className='text-[1.75rem] sm:text-4xl lg:text-5xl font-heading text-foreground leading-[1.15] mb-4 tracking-tight animate-fade-in-up [animation-delay:200ms] opacity-0 fill-mode-forwards'>
            Nghệ Thuật{' '}
            <span className='bg-linear-to-r from-primary via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
              Chăm Sóc Xe
            </span>
          </h1>
          <p className='text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg font-medium leading-relaxed'>
            Từng chi tiết nhỏ nhất đều được WAVE chăm chút tỉ mỉ để mang lại vẻ
            đẹp nguyên bản và đẳng cấp cho xế yêu của bạn.
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8'>
          {/* Image 2 */}
          <div className='relative group overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl aspect-video sm:aspect-4/3 lg:aspect-2/1'>
            <Image
              src='/h2.jpg'
              alt='Showcase'
              fill
              sizes='(max-width: 640px) 100vw, 50vw'
              className='object-cover transition-transform duration-700 group-hover:scale-110'
            />
            <div className='absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-end p-5 sm:p-8 lg:p-10'>
              <span className='text-white font-black text-xl sm:text-2xl lg:text-3xl tracking-tighter'>
                Deep Cleaning
              </span>
            </div>
          </div>

          {/* Image 3 */}
          <div className='relative group overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl aspect-video sm:aspect-4/3 lg:aspect-2/1'>
            <Image
              src='/h3.jpg'
              alt='Showcase'
              fill
              sizes='(max-width: 640px) 100vw, 50vw'
              className='object-cover transition-transform duration-700 group-hover:scale-110'
            />
            <div className='absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-end p-5 sm:p-8 lg:p-10'>
              <span className='text-white font-black text-xl sm:text-2xl lg:text-3xl tracking-tighter'>
                Interior Perfection
              </span>
            </div>
          </div>

          {/* Image 5 */}
          <div className='relative group overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl aspect-video sm:aspect-4/3 lg:aspect-2/1'>
            <Image
              src='/h5.jpg'
              alt='Showcase'
              fill
              sizes='(max-width: 640px) 100vw, 50vw'
              className='object-cover transition-transform duration-700 group-hover:scale-110'
            />
          </div>

          {/* Image 6 */}
          <div className='relative group overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl aspect-video sm:aspect-4/3 lg:aspect-2/1'>
            <Image
              src='/h6.jpg'
              alt='Showcase'
              fill
              sizes='(max-width: 640px) 100vw, 50vw'
              className='object-cover transition-transform duration-700 group-hover:scale-110'
            />
          </div>
        </div>
      </div>
    </section>
  );
}
