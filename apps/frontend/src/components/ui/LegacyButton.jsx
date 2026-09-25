import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

import { cn } from './cn.js';

const BASE_CLASSES =
  'inline-flex min-h-court items-center justify-center gap-2 rounded-md px-6 font-display text-sm font-semibold uppercase tracking-wide transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:pointer-events-none disabled:opacity-50';

// Primary is bg-action (brand green) with navy text -- NEVER white text on
// green, see tailwind.config.js: raw green fails contrast at 1.49:1.
const VARIANT_CLASSES = {
  primary: 'bg-action text-on-action hover:bg-green-400',
  secondary: 'bg-navy-500 text-on-inverse hover:bg-navy-600',
  outline: 'border border-navy-500 bg-transparent text-primary hover:bg-navy-50',
  ghost: 'bg-transparent text-primary hover:bg-neutral-100',
  danger: 'bg-error text-on-inverse hover:opacity-90',
};

/**
 * Polymorphic button: renders a router `Link` when given `to`, a plain
 * anchor when given `href`, otherwise a real `<button>`. One component so
 * every clickable action in the app shares the same look and focus style.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', className, to, href, children, ...props },
  ref,
) {
  const classes = cn(BASE_CLASSES, VARIANT_CLASSES[variant], className);

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});
