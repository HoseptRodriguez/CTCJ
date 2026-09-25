import { cn } from './cn.js';

/**
 * The club's real photos -- the ONLY images the app uses (no stock, no
 * generated images). Each exists in public/img as <name>-<width>.webp and
 * .jpg; all are portrait 2:3. `widths` must match the files on disk.
 */
export const CLUB_PHOTOS = {
  'hero-canchas': {
    widths: [560, 900, 1400, 1920],
    alt: 'Canchas de arcilla del club con banderines de colores, reflectores y las montañas al fondo bajo un cielo con nubes',
  },
  'instalacion-red': {
    widths: [480, 700, 1000],
    alt: 'Vista de las canchas de arcilla del club, con la red, los reflectores y la cordillera al fondo',
  },
  'accion-saque': {
    widths: [480, 700, 1000],
    alt: 'Jugador juvenil lanzando la bola para sacar en una cancha de arcilla del club',
  },
  'accion-palmeras': {
    widths: [480, 700, 1000],
    alt: 'Jugador sacando en una cancha de arcilla, con palmeras y público al fondo',
  },
  'accion-desplazamiento': {
    widths: [480, 700],
    alt: 'Jugador adulto estirándose para devolver un revés en una cancha de arcilla',
  },
  'accion-espera': {
    widths: [480, 700],
    alt: 'Jugador en posición de espera con la raqueta lista, con árboles y montañas detrás',
  },
};

const RATIO = { width: 2, height: 3 };

function srcSet(name, widths, ext) {
  return widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');
}

/**
 * <picture> with WebP + JPG fallbacks and responsive sizes. Lazy by default;
 * pass `priority` for the one photo at the top of the page (eager load, high
 * fetch priority). The clay background shows while the image loads, and the
 * intrinsic width/height reserve its space so nothing jumps.
 *
 * @param {{ name: keyof typeof CLUB_PHOTOS, alt?: string, sizes?: string,
 *   priority?: boolean, className?: string, imgClassName?: string }} props
 *   `alt=""` marks a purely decorative use. `sizes` should describe the
 *   rendered width (default: full width on mobile, half from md).
 *   Crop with `className` (e.g. "aspect-[16/9]") -- the image covers it.
 */
export function ClubPhoto({
  name,
  alt,
  sizes = '(min-width: 768px) 50vw, 100vw',
  priority = false,
  className,
  imgClassName,
}) {
  const photo = CLUB_PHOTOS[name];
  if (!photo) {
    throw new Error(
      `ClubPhoto: unknown photo "${name}". Available: ${Object.keys(CLUB_PHOTOS).join(', ')}`,
    );
  }
  const { widths } = photo;
  const largest = widths[widths.length - 1];
  const fallbackWidth = widths[Math.min(1, widths.length - 1)];

  return (
    <picture className={cn('block overflow-hidden bg-clay', className)}>
      <source type="image/webp" srcSet={srcSet(name, widths, 'webp')} sizes={sizes} />
      <img
        src={`/img/${name}-${fallbackWidth}.jpg`}
        srcSet={srcSet(name, widths, 'jpg')}
        sizes={sizes}
        alt={alt ?? photo.alt}
        width={largest}
        height={(largest / RATIO.width) * RATIO.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // Lowercase on purpose: React 18 doesn't know `fetchPriority` and
        // warns about it; the lowercase attribute passes straight through.
        // eslint-disable-next-line react/no-unknown-property
        fetchpriority={priority ? 'high' : undefined}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </picture>
  );
}
