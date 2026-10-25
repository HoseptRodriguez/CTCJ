import { useSyncExternalStore } from 'react';

/**
 * Motion rules for an adult audience: animation explains what just happened,
 * it never decorates. Only transform and opacity are animated (cheap on slow
 * PCs and phones); nothing loops, blinks or moves on its own in dashboards.
 *
 * Durations are in SECONDS -- the unit both GSAP and framer-motion take.
 */
export const DURATION = {
  fast: 0.15, // hover-like feedback, exits
  base: 0.2, // response to an action (toast, check, tab change)
  slow: 0.25, // panels and dialogs entering -- the ceiling for action feedback
  entrance: 0.6, // one public-site element entering
  heroTotal: 1.2, // hard ceiling for the whole home-page entrance
};

/** framer-motion cubic-bezier curves (match tailwind.config.js transitionTimingFunction). */
export const EASE = {
  standard: [0.2, 0, 0, 1],
  entrance: [0, 0, 0, 1],
  exit: [0.3, 0, 1, 1],
};

/** GSAP equivalents. */
export const GSAP_EASE = {
  standard: 'power2.out',
  entrance: 'power3.out',
  exit: 'power2.in',
};

const QUERY = '(prefers-reduced-motion: reduce)';

function getMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(QUERY);
}

/** Non-hook check, for one-off decisions outside render. */
export function prefersReducedMotion() {
  return getMediaQuery()?.matches ?? false;
}

function subscribe(onChange) {
  const mq = getMediaQuery();
  if (!mq) return () => {};
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

/**
 * true when the person asked their OS for less motion. Updates live if the
 * setting changes. Shared by GSAP components (skip the timeline, render the
 * final state) and framer-motion components (initial={false}, duration 0),
 * so both libraries obey the same switch.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

/**
 * framer-motion transition that collapses to "no animation" under reduced
 * motion. Usage: transition={motionTransition(reduced, { duration: DURATION.base })}
 */
export function motionTransition(reduced, transition = {}) {
  if (reduced) return { duration: 0 };
  return { duration: DURATION.base, ease: EASE.standard, ...transition };
}
