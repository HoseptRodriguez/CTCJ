import { useId, useRef } from 'react';

import { GSAP_EASE, useReducedMotion } from '../../lib/motion.js';
import { gsap, useGSAP } from '../../lib/gsap.js';
import { cn } from '../ui/cn.js';

// Fixed geometry: a serve-like arc across a 600x300 box. END is the path's
// last point, so the final state can be rendered without measuring the path
// (and without JS at all).
const PATH = 'M 40 250 Q 300 -70 540 236';
const START = { x: 40, y: 250 };
const END = { x: 540, y: 236 };
const BALL_RADIUS = 18;
const BOUNCE_HEIGHT = 34;

const DRAW_S = 0.9;
const BOUNCE_UP_S = 0.14;
const BOUNCE_DOWN_S = 0.16; // total 1.2s -- the home entrance ceiling

const TONES = {
  dark: { dots: 'rgba(255,255,255,0.7)', seam: '#FFFFFF' }, // on navy
  light: { dots: '#001A4D', seam: '#FFFFFF' }, // on white/page
};

/**
 * Decorative hero flourish: a lime tennis ball flies along a dotted arc that
 * draws itself (stroke-dashoffset on a mask), then bounces once. Runs once,
 * on mount. With reduced motion it renders the finished drawing, ball at rest.
 *
 * The dotted line can't be "drawn" with its own dash pattern, so a solid
 * masking stroke is animated instead and reveals the dots underneath.
 *
 * @param {{ tone?: 'dark'|'light', className?: string }} props
 */
export function HeroBallTrajectory({ tone = 'dark', className }) {
  const reduced = useReducedMotion();
  const maskId = useId();
  const root = useRef(null);
  const colors = TONES[tone];

  useGSAP(
    () => {
      if (reduced) return;
      const svg = root.current;
      const track = svg.querySelector('[data-part="mask-path"]');
      const ball = svg.querySelector('[data-part="ball"]');
      const length = track.getTotalLength?.();
      if (!length) return; // environment can't measure SVG: keep the final state

      const moveBall = ({ x, y }) => gsap.set(ball, { x, y });
      const progress = { t: 0 };

      gsap.set(track, { strokeDasharray: length, strokeDashoffset: length });
      moveBall(START);

      gsap
        .timeline()
        .to(track, { strokeDashoffset: 0, duration: DRAW_S, ease: 'power1.inOut' }, 0)
        .to(
          progress,
          {
            t: 1,
            duration: DRAW_S,
            ease: 'power1.inOut',
            onUpdate: () => moveBall(track.getPointAtLength(progress.t * length)),
          },
          0,
        )
        .to(ball, { y: END.y - BOUNCE_HEIGHT, duration: BOUNCE_UP_S, ease: GSAP_EASE.standard })
        .to(ball, { y: END.y, duration: BOUNCE_DOWN_S, ease: 'power2.in' });
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <svg
      ref={root}
      viewBox="0 0 600 300"
      className={cn('h-auto w-full', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="-100" width="600" height="420">
          <path
            data-part="mask-path"
            d={PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <path
        data-part="dots"
        d={PATH}
        fill="none"
        stroke={colors.dots}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0.1 14"
        mask={`url(#${maskId})`}
      />
      <g data-part="ball" transform={`translate(${END.x} ${END.y})`}>
        <circle r={BALL_RADIUS} fill="#9EE67C" />
        <path
          d={`M ${-BALL_RADIUS + 4} -8 C -6 -2, -6 2, ${-BALL_RADIUS + 4} 8`}
          fill="none"
          stroke={colors.seam}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${BALL_RADIUS - 4} -8 C 6 -2, 6 2, ${BALL_RADIUS - 4} 8`}
          fill="none"
          stroke={colors.seam}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
