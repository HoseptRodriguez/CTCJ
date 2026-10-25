import { useId } from 'react';

import { cn } from './cn.js';

const PADDING = { none: '', md: 'p-5 md:p-6', lg: 'p-6 md:p-8' };

/**
 * White surface on the grey page background. Give it a `title` to get a
 * proper heading (h2 by default; pass `headingLevel` to fit the page outline)
 * and optional `actions` aligned with the title. A titled section is named
 * after its heading (aria-labelledby), so screen readers list it as a region.
 */
export function Card({
  as: Tag = 'section',
  title,
  headingLevel = 2,
  description,
  actions,
  footer,
  padding = 'md',
  className,
  children,
  ...props
}) {
  const Heading = `h${headingLevel}`;
  const headingId = useId();
  const labelled = title && Tag === 'section' && !props['aria-label'] && !props['aria-labelledby'];
  return (
    <Tag
      className={cn('rounded-xl border border-line bg-surface text-ink shadow-sm', className)}
      aria-labelledby={labelled ? headingId : undefined}
      {...props}
    >
      <div className={PADDING[padding]}>
        {(title || actions) && (
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              {title && (
                <Heading id={headingId} className="font-display text-h3 font-bold text-ink">
                  {title}
                </Heading>
              )}
              {description && <p className="mt-1 text-body text-ink-soft">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </div>
      {footer && (
        <div className={cn('border-t border-line bg-page/60 rounded-b-xl', PADDING[padding])}>
          {footer}
        </div>
      )}
    </Tag>
  );
}
