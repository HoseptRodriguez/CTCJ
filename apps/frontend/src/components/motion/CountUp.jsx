import { useRef } from 'react';

import { DURATION, GSAP_EASE, useReducedMotion } from '../../lib/motion.js';
import { gsap, useGSAP } from '../../lib/gsap.js';
import { cn } from '../ui/cn.js';

const defaultFormat = (n) => new Intl.NumberFormat('es-CO').format(Math.round(n));

/**
 * A number that counts up to `value` the first time it scrolls into view.
 *
 * - No layout shift: an invisible copy of the final number reserves the
 *   width, and the counting copy is stacked on top of it.
 * - Screen readers only ever hear the final value (the counting copy is
 *   aria-hidden).
 * - Reduced motion: the final number, immediately.
 *
 * @param {{ value: number, duration?: number, format?: (n: number) => string,
 *   prefix?: string, suffix?: string, className?: string }} props
 */
export function CountUp({
  value,
  duration = DURATION.heroTotal,
  format = defaultFormat,
  prefix = '',
  suffix = '',
  className,
}) {
  const reduced = useReducedMotion();
  const root = useRef(null);
  const counter = useRef(null);
  const finalText = `${prefix}${format(value)}${suffix}`;

  useGSAP(
    () => {
      if (reduced) return;
      const state = { n: 0 };
      // Write into React's own text node (nodeValue), never replace it via
      // textContent -- otherwise React would later update a detached node.
      const textNode = counter.current.firstChild;
      const render = () => {
        textNode.nodeValue = `${prefix}${format(state.n)}${suffix}`;
      };
      render();
      gsap.to(state, {
        n: value,
        duration,
        ease: GSAP_EASE.standard,
        onUpdate: render,
        scrollTrigger: { trigger: root.current, start: 'top 90%', once: true },
      });
    },
    { scope: root, dependencies: [reduced, value] },
  );

  return (
    <span ref={root} className={cn('inline-grid tabular-nums', className)}>
      <span className="sr-only">{finalText}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {finalText}
      </span>
      <span
        ref={counter}
        aria-hidden="true"
        data-part="count"
        className="col-start-1 row-start-1 text-right"
      >
        {finalText}
      </span>
    </span>
  );
}
