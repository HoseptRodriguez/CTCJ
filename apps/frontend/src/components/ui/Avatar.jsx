import { useEffect, useState } from 'react';

import { cn } from './cn.js';

const SIZES = {
  sm: 'h-10 w-10 text-body',
  md: 'h-12 w-12 text-h3',
  lg: 'h-14 w-14 text-h2',
  xl: 'h-28 w-28 text-[3rem]',
};

/** "Ana María Gómez" -> "AG"; one name -> one letter; nothing -> "?". */
export function initialsOf(firstName, lastName) {
  const first = (firstName ?? '').trim().charAt(0);
  const last = (lastName ?? '').trim().charAt(0);
  const text = `${first}${last}`.toUpperCase();
  return text || '?';
}

/**
 * A person's picture. If there is no photo, or it fails to load (missing
 * file, blocked URL, broken image), it shows their initials on lime instead
 * of the browser's broken-image icon.
 *
 * @param {{ src?: string|null, firstName?: string, lastName?: string,
 *   size?: 'sm'|'md'|'lg'|'xl', alt?: string, fallbackAlt?: string, className?: string }} props
 *   `alt`: pass it only when the picture carries meaning on its own
 *   (e.g. "Tu foto de perfil"); otherwise it's decorative next to the name.
 *   `fallbackAlt`: the name for the initials version ("Aún sin foto").
 */
export function Avatar({ src, firstName, lastName, size = 'md', alt, fallbackAlt, className }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const box = cn('shrink-0 rounded-full', SIZES[size], className);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        onError={() => setFailed(true)}
        className={cn(box, 'object-cover')}
      />
    );
  }
  const label = fallbackAlt ?? alt;
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn(
        box,
        'flex items-center justify-center bg-lime font-display font-bold text-navy-500',
      )}
    >
      {initialsOf(firstName, lastName)}
    </span>
  );
}
