import { cn } from './cn.js';

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  inverse = false,
  className,
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? (
        <p
          className={cn(
            'font-display text-sm font-semibold uppercase tracking-eyebrow',
            inverse ? 'text-on-inverse-muted' : 'text-tertiary',
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2
          className={cn(
            'mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl',
            inverse ? 'text-on-inverse' : 'text-primary',
          )}
        >
          {title}
        </h2>
      ) : null}
      {lede ? (
        <p
          className={cn(
            'mt-4 text-lg leading-normal',
            inverse ? 'text-on-inverse-muted' : 'text-secondary',
          )}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}
