import { motion } from 'framer-motion';

import { DURATION, EASE, useReducedMotion } from '../../lib/motion.js';
import { cn } from '../ui/cn.js';

/**
 * "Done" confirmation after a booking is confirmed or a payment recorded:
 * the circle pops in (scale) and the check draws itself. ~0.25s total, runs
 * once when mounted -- render it at the moment of success.
 *
 * It is an image with a label (`label`, e.g. "Pago registrado") so the
 * success is announced, not only shown. Reduced motion: drawn immediately.
 *
 * @param {{ label: string, size?: number, className?: string }} props
 */
export function AnimatedCheck({ label, size = 64, className }) {
  const reduced = useReducedMotion();
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    >
      <motion.circle
        data-part="circle"
        cx="32"
        cy="32"
        r="30"
        fill="#E4F7DA"
        stroke="#2C5E17"
        strokeWidth="3"
        style={{ originX: '50%', originY: '50%' }}
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { duration: DURATION.fast, ease: EASE.entrance }}
      />
      <motion.path
        data-part="check"
        d="M19 33.5 28 42 45 23"
        fill="none"
        stroke="#2C5E17"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={
          reduced ? { duration: 0 } : { duration: DURATION.base, delay: 0.05, ease: EASE.standard }
        }
      />
    </svg>
  );
}
