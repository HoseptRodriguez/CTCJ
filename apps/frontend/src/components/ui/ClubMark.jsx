import { cn } from './cn.js';

const HEIGHTS = { sm: 28, md: 40, lg: 56 };
// Trimmed fireball isotype, cut from the club crest (375x107).
const RATIO = 375 / 107;

/**
 * The club's short mark: the fireball ball with the "R", no oval, no white
 * disc. Use it for headers, the console, loading and empty states; the full
 * crest (ClubLogo) is only for the "El club" page and the printed receipt.
 *
 * @param {{ tone?: 'dark'|'light', size?: 'sm'|'md'|'lg', className?: string, decorative?: boolean }} props
 *   `tone`: the background it sits on -- 'dark' (navy) keeps the white "R",
 *   'light' uses a navy "R". `decorative`: next to the written club name.
 */
export function ClubMark({ tone = 'dark', size = 'md', className, decorative = true }) {
  const height = HEIGHTS[size];
  const width = Math.round(height * RATIO);
  const base = tone === 'dark' ? '/isotipo-oscuro' : '/isotipo-claro';
  return (
    <picture className={cn('inline-block shrink-0', className)}>
      <source type="image/webp" srcSet={`${base}-64.webp 1x, ${base}-128.webp 2x`} />
      <img
        src={`${base}-64.png`}
        srcSet={`${base}-64.png 1x, ${base}-128.png 2x`}
        width={width}
        height={height}
        alt={decorative ? '' : 'Club de Tenis Ciudad Jardín'}
        className="block w-auto"
        style={{ height }}
      />
    </picture>
  );
}
