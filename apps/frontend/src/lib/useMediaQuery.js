import { useSyncExternalStore } from 'react';

/**
 * true while `query` matches (e.g. '(min-width: 768px)'). Used where the
 * phone and desktop layouts are genuinely different components, so only one
 * is ever in the DOM (no duplicated buttons for screen readers).
 * Without matchMedia (tests), it reports false: the phone layout.
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  );
}
