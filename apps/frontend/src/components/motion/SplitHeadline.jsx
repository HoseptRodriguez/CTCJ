import { useRef } from 'react';

import { DURATION, GSAP_EASE, useReducedMotion } from '../../lib/motion.js';
import { gsap, useGSAP } from '../../lib/gsap.js';
import { cn } from '../ui/cn.js';

const STAGGER_S = 0.12;

/**
 * Headline that enters line by line (never letter by letter -- whole words
 * stay readable while they move). Lines are given explicitly, so the break
 * points are editorial choices, not an accident of the screen width.
 *
 * Each line slides up from behind a clip (transform only). Screen readers
 * get the plain text. Reduced motion: rendered in place, no animation.
 *
 * @param {{ lines: string[], as?: string, delay?: number, className?: string,
 *   lineClassName?: string }} props
 */
export function SplitHeadline({ lines, as: Tag = 'h1', delay = 0, className, lineClassName }) {
  const reduced = useReducedMotion();
  const root = useRef(null);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.from(root.current.querySelectorAll('[data-line]'), {
        yPercent: 105,
        opacity: 0,
        duration: DURATION.entrance,
        ease: GSAP_EASE.entrance,
        stagger: STAGGER_S,
        delay,
      });
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <Tag ref={root} className={className}>
      {lines.map((line, i) => (
        // The clip gets a little vertical room so accents (Í, Ñ) and
        // descenders aren't cut off by the tight display line-height.
        <span key={i} className="-my-[0.1em] block overflow-hidden py-[0.1em]">
          <span data-line className={cn('block', lineClassName)}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
