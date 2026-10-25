import { useRef } from 'react';

import { useReducedMotion } from '../../lib/motion.js';
import { gsap, useGSAP } from '../../lib/gsap.js';
import { ClubPhoto } from '../ui/ClubPhoto.jsx';
import { cn } from '../ui/cn.js';

// Total travel of the photo while its frame crosses the screen. The inner
// layer is taller than the frame by the same amount, so no gap ever shows.
export const PARALLAX_TRAVEL_PX = 40;

/**
 * ClubPhoto with a gentle scroll parallax (max 40px), scrubbed to the scroll
 * position by ScrollTrigger -- it only moves when the person scrolls, never
 * on its own. Transform only. Reduced motion: a still photo.
 *
 * Props are ClubPhoto's; `className` sizes the frame (e.g. "aspect-[4/5]").
 */
export function ParallaxPhoto({ className, ...photoProps }) {
  const reduced = useReducedMotion();
  const frame = useRef(null);
  const layer = useRef(null);
  const half = PARALLAX_TRAVEL_PX / 2;

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        layer.current,
        { y: -half },
        {
          y: half,
          ease: 'none',
          scrollTrigger: {
            trigger: frame.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );
    },
    { scope: frame, dependencies: [reduced] },
  );

  return (
    <div ref={frame} className={cn('relative overflow-hidden bg-clay', className)}>
      <div
        ref={layer}
        data-part="parallax-layer"
        className="absolute inset-x-0"
        style={{ top: -half, bottom: -half }}
      >
        <ClubPhoto {...photoProps} className="h-full w-full" />
      </div>
    </div>
  );
}
