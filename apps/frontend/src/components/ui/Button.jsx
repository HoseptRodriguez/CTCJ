import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

import { cn } from './cn.js';

const BASE =
  'focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-sans font-semibold ' +
  'transition-colors duration-fast ease-standard select-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60';

const SIZES = {
  md: 'min-h-btn min-w-btn px-5 text-body', // 48px -- every control
  lg: 'min-h-btn-lg min-w-btn px-8 text-lead', // 64px -- the page's main action
};

// `tone` is the surface the button sits on. Navy is the primary action on
// light surfaces; lime (always with navy text, 11.21:1) is the primary
// action on navy surfaces.
const VARIANTS = {
  light: {
    primary: 'bg-navy-500 text-white hover:bg-navy-400',
    secondary: 'border-2 border-navy-500 bg-surface text-navy-500 hover:bg-navy-50',
    ghost: 'text-navy-500 underline-offset-4 hover:bg-navy-50 hover:underline',
    danger: 'bg-danger text-white hover:bg-danger-hover',
  },
  dark: {
    primary: 'bg-lime text-navy-500 hover:bg-lime-hover',
    secondary: 'border-2 border-white bg-transparent text-white hover:bg-white/10',
    ghost: 'text-white underline-offset-4 hover:bg-white/10 hover:underline',
    danger: 'bg-danger text-white hover:bg-danger-hover',
  },
};

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Design system v2 button. Always has visible text (use a verb: "Reservar
 * cancha", "Guardar nota"); `icon` is decorative and sits before the text.
 *
 * Polymorphic: renders a router Link with `to`, an anchor with `href`,
 * otherwise a real <button> (type="button" unless told otherwise, so it
 * never submits a form by accident).
 *
 * @param {{
 *   variant?: 'primary'|'secondary'|'ghost'|'danger',
 *   size?: 'md'|'lg',
 *   tone?: 'light'|'dark',
 *   icon?: import('react').ReactNode,
 *   loading?: boolean,
 *   loadingText?: string,
 *   fullWidth?: boolean,
 * } & Record<string, any>} props
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    tone = 'light',
    icon,
    loading = false,
    loadingText,
    fullWidth = false,
    className,
    to,
    href,
    type = 'button',
    disabled,
    children,
    ...props
  },
  ref,
) {
  const classes = cn(BASE, SIZES[size], VARIANTS[tone][variant], fullWidth && 'w-full', className);
  const content = (
    <>
      {loading ? (
        <Spinner />
      ) : (
        icon && <span className="h-6 w-6 shrink-0 [&>svg]:h-full [&>svg]:w-full">{icon}</span>
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
});
