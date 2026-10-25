import { motion } from 'framer-motion';

import { DURATION, EASE, useReducedMotion } from '../../lib/motion.js';

/** Delay between two siblings of a staggered group (seconds). */
export const REVEAL_STAGGER = 0.08;

/**
 * Fades in and rises 16px the first time it scrolls into view -- once, never
 * again. `index` staggers siblings (cards of a grid). Reduced motion: the
 * content is simply there, with no animation.
 *
 * @param {{ as?: 'div'|'li'|'section', index?: number, className?: string,
 *   children: import('react').ReactNode }} props
 */
export function Reveal({ as = 'div', index = 0, className, children, ...rest }) {
  const reduced = useReducedMotion();
  if (reduced) {
    const Tag = as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  const Motion = motion[as];
  return (
    <Motion
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: DURATION.entrance,
        ease: EASE.entrance,
        delay: Math.min(index, 5) * REVEAL_STAGGER,
      }}
      {...rest}
    >
      {children}
    </Motion>
  );
}
