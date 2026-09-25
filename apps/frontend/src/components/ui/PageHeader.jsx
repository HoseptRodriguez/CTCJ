import { Link } from 'react-router-dom';

import { ArrowLeftIcon } from '../icons/ArrowLeftIcon.jsx';

import { cn } from './cn.js';

/**
 * Top of every page: optional "Volver" link, the page's only <h1> (48px,
 * 56px from md), a one-line explanation, and the page's main actions.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  backTo,
  backLabel = 'Volver',
  className,
}) {
  return (
    <header className={cn('mb-8 md:mb-10', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="focus-ring mb-4 inline-flex min-h-btn items-center gap-2 rounded-lg pr-3 text-body font-semibold text-navy-500 underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-prose">
          {eyebrow && <p className="mb-2 text-body font-semibold text-clay-dark">{eyebrow}</p>}
          <h1 className="font-display text-title font-bold text-ink md:text-title-lg">{title}</h1>
          {description && <p className="mt-3 text-lead text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}
