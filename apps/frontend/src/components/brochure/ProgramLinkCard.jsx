import { Link } from 'react-router-dom';

import { ClubPhoto } from '../ui/ClubPhoto.jsx';

/**
 * A whole-card link to a program (home and "Otros programas"): photo zoom,
 * lift and a sliding arrow on hover and keyboard focus; all off with
 * prefers-reduced-motion.
 */
export function ProgramLinkCard({
  program,
  className = 'h-64',
  sizes = '(min-width: 768px) 50vw, 100vw',
}) {
  return (
    <Link
      to={`/programas/${program.slug}`}
      className={`focus-ring group relative block overflow-hidden rounded-xl shadow-sm transition duration-normal ease-out hover:-translate-y-1 hover:shadow-md focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 ${className}`}
    >
      <ClubPhoto
        name={program.photo}
        alt=""
        sizes={sizes}
        className="h-full w-full transition-transform duration-slow ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
      />
      <span className="absolute inset-x-4 bottom-4 flex flex-col items-start gap-2">
        <span className="rounded-lg bg-navy-500 px-4 py-2 font-display text-h3 font-bold text-white shadow-md">
          {program.cardLabel}
        </span>
        <span className="rounded-lg bg-lime px-3 py-1 text-body font-semibold text-navy-500">
          Ver programa{' '}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-normal group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        </span>
      </span>
    </Link>
  );
}
