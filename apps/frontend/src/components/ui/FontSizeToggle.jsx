import { useEffect, useState } from 'react';

import { CheckIcon } from '../icons/CheckIcon.jsx';
import {
  FONT_SCALE_EVENT,
  applyFontScale,
  readStoredFontScale,
  storeFontScale,
} from '../../lib/fontScale.js';

import { cn } from './cn.js';

/**
 * "A+ Letra grande": enlarges every text in the app to 115% and remembers
 * the choice on this device. A toggle button (aria-pressed) whose label
 * never changes -- the pressed state is shown by the lime fill and a check.
 *
 * @param {{ tone?: 'light'|'dark', className?: string }} props
 *   `tone`: the surface it sits on (dark = navy header).
 */
export function FontSizeToggle({ tone = 'light', className }) {
  // <html> is the source of truth for this session (it survives even when
  // localStorage is unavailable); storage only matters on a fresh load.
  const [large, setLarge] = useState(
    () =>
      document.documentElement.dataset.fontScale === 'large' || readStoredFontScale() === 'large',
  );

  // Keeps <html> in sync even if main.jsx's initFontScale() didn't run
  // (tests, embedded previews).
  useEffect(() => {
    applyFontScale(large ? 'large' : 'normal');
  }, [large]);

  useEffect(() => {
    const sync = (event) => setLarge(event.detail === 'large');
    window.addEventListener(FONT_SCALE_EVENT, sync);
    return () => window.removeEventListener(FONT_SCALE_EVENT, sync);
  }, []);

  function toggle() {
    const next = !large;
    setLarge(next);
    storeFontScale(next ? 'large' : 'normal');
  }

  return (
    <button
      type="button"
      aria-pressed={large}
      onClick={toggle}
      className={cn(
        'focus-ring inline-flex min-h-btn items-center gap-2 rounded-lg border-2 px-4 text-body font-semibold transition-colors duration-fast',
        large
          ? 'border-navy-500 bg-lime text-navy-500'
          : tone === 'dark'
            ? 'border-white text-white hover:bg-white/10'
            : 'border-navy-500 bg-surface text-navy-500 hover:bg-navy-50',
        className,
      )}
    >
      {large && <CheckIcon className="h-5 w-5" />}
      <span aria-hidden="true" className="font-display text-lead font-bold">
        A+
      </span>
      Letra grande
    </button>
  );
}
