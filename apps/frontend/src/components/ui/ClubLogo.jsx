import { cn } from './cn.js';

const HEIGHTS = { md: 56, lg: 72, xl: 112 };
// Oval crop of "Logo del Club con Fondo.jpg" (1200x1200 original); 240/480px wide.
const RATIO = 335 / 480;

/**
 * The club crest (oval, navy with a lime ring). The crest's own navy
 * disappears on navy backgrounds, so with `onDark` it sits in a white oval
 * with 6px of padding. Minimum 56px tall in headers.
 *
 * @param {{ size?: 'md'|'lg'|'xl', onDark?: boolean, className?: string, decorative?: boolean }} props
 *   `decorative`: next to the written club name, so screen readers skip it.
 */
export function ClubLogo({ size = 'md', onDark = false, className, decorative = false }) {
  const height = HEIGHTS[size];
  const width = Math.round(height / RATIO);
  const img = (
    <picture>
      <source
        type="image/webp"
        srcSet="/logo-club-240.webp 240w, /logo-club-480.webp 480w"
        sizes={`${width}px`}
      />
      <img
        src="/logo-club-240.png"
        srcSet="/logo-club-240.png 240w, /logo-club-480.png 480w"
        sizes={`${width}px`}
        width={width}
        height={height}
        alt={decorative ? '' : 'Escudo del Club de Tenis Ciudad Jardín'}
        className="block h-full w-auto"
        style={{ height }}
      />
    </picture>
  );

  if (!onDark) return <span className={cn('inline-block shrink-0', className)}>{img}</span>;
  return (
    <span className={cn('inline-block shrink-0 rounded-[50%] bg-white p-1.5 shadow-sm', className)}>
      {img}
    </span>
  );
}
