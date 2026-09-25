import { cn } from './cn.js';

/**
 * Grey placeholder shaped like the content that is loading, so the page
 * doesn't jump when it arrives. Decorative: wrap a group of skeletons in
 * <SkeletonGroup label="Cargando reservas…"> so screen readers hear one
 * status message instead of nothing. The pulse stops under
 * prefers-reduced-motion (global rule in tokens.css).
 */
export function Skeleton({ className }) {
  return (
    <span aria-hidden="true" className={cn('block animate-pulse rounded-lg bg-muted', className)} />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <span aria-hidden="true" className={cn('block space-y-3', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </span>
  );
}

export function SkeletonGroup({ label = 'Cargando…', className, children }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
