import { cn } from './cn.js';

/** Single "coming soon" variant, reused by every forward-looking section (Ranking, NewsAndEvents, etc). */
export function Badge({ children = 'Próximamente', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-navy-200 bg-navy-50 px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-navy-500',
        className,
      )}
    >
      {children}
    </span>
  );
}
