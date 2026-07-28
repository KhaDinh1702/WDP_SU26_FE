'use client';

export function BrandMarquee() {
  const brands = [
    'Mercedes-Benz',
    'BMW',
    'Audi',
    'Porsche',
    'Lamborghini',
    'Ferrari',
    'Tesla',
    'Lexus',
    'Range Rover',
  ];

  return (
    <section className='py-3 sm:py-4 bg-background border-y border-border overflow-hidden relative z-20'>
      <div className='max-w-7xl mx-auto px-4 mb-1 text-center'>
        <p className='text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30 bg-linear-to-r from-foreground/30 via-foreground/60 to-foreground/30 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent'>
          Trusted by owners of
        </p>
      </div>

      <div className='flex overflow-hidden group'>
        <div className='flex py-2 animate-marquee whitespace-nowrap group-hover:pause'>
          {[...brands, ...brands].map((brand, i) => (
            <span
              key={i}
              className='text-2xl md:text-4xl font-black text-foreground/10 mx-8 md:mx-12 hover:text-primary/40 transition-colors cursor-default select-none tracking-tighter italic'
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
