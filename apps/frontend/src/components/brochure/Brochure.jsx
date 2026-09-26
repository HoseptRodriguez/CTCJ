import { ClubPhoto } from '../ui/ClubPhoto.jsx';
import { cn } from '../ui/cn.js';

/**
 * The club brochure's look -- PUBLIC SITE ONLY (never the console or Mi
 * CTCJ): uppercase Archivo Narrow 700 titles with a short horizontal rule,
 * and lime / navy blocks cut diagonally against a photo.
 *
 * Contrast: navy text on lime is 11.2:1, white on navy 16:1 (AA+).
 */

const TONES = {
  navy: { block: 'bg-navy-500 text-white', rule: 'bg-lime', muted: 'text-white/90' },
  lime: { block: 'bg-lime text-navy-500', rule: 'bg-navy-500', muted: 'text-navy-500' },
  white: { block: 'bg-surface text-ink', rule: 'bg-clay', muted: 'text-ink-soft' },
};

/** "MISIÓN ———": uppercase condensed title with a decorative rule after it. */
export function BrochureTitle({ as: Tag = 'h2', id, tone = 'white', children, className }) {
  return (
    <Tag
      id={id}
      className={cn(
        'flex items-center gap-4 font-display text-[2rem] font-bold uppercase leading-none tracking-wide md:text-[2.75rem]',
        className,
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-16 shrink-0 rounded-full md:w-24', TONES[tone].rule)}
      />
    </Tag>
  );
}

/**
 * A photo and a colored block side by side, with the photo's edge cut on a
 * diagonal into the block (clip-path). On phones the photo sits on top and
 * the diagonal runs along its bottom edge.
 *
 * @param {{ photo: string, photoAlt?: string, tone?: 'navy'|'lime', photoSide?: 'left'|'right',
 *   titleId: string, children: import('react').ReactNode }} props
 */
export function DiagonalSection({
  photo,
  photoAlt,
  tone = 'navy',
  photoSide = 'left',
  titleId,
  children,
}) {
  const left = photoSide === 'left';
  return (
    <section aria-labelledby={titleId} className={cn('overflow-hidden', TONES[tone].block)}>
      <div
        className={cn(
          'flex flex-col md:min-h-[34rem]',
          left ? 'md:flex-row' : 'md:flex-row-reverse',
        )}
      >
        <div
          className={cn(
            'relative h-72 shrink-0 sm:h-96 md:h-auto md:w-1/2',
            '[clip-path:polygon(0_0,100%_0,100%_86%,0_100%)]',
            left
              ? 'md:[clip-path:polygon(0_0,100%_0,82%_100%,0_100%)]'
              : 'md:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]',
          )}
        >
          <ClubPhoto
            name={photo}
            alt={photoAlt}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <div className="flex items-center px-4 py-12 md:w-1/2 md:px-12 lg:px-16">
          <div className="max-w-prose">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function toneText(tone) {
  return TONES[tone].muted;
}
