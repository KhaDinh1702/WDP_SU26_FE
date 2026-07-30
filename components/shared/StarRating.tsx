import { Star } from 'lucide-react';

/** Dãy 5 sao, tô vàng tới mức `rating`. Dùng chung cho các màn hình đánh giá. */
export function StarRating({
  rating,
  size = 'size-4',
}: {
  rating: number;
  size?: string;
}) {
  return (
    <span
      className='inline-flex items-center gap-0.5'
      role='img'
      aria-label={`${rating} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={`${size} ${
            star <= rating ? 'fill-warning text-warning' : 'fill-muted text-muted'
          }`}
        />
      ))}
    </span>
  );
}
