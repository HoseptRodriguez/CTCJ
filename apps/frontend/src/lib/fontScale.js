import { COOKIE_CONSENT_EVENT, hasCookieConsent } from './cookieConsent.js';

/**
 * "A+ Letra grande" preference. The root <html> gets data-font-scale="large"
 * (styles/tokens.css scales it to 115%).
 *
 * Remembering it across visits uses localStorage, which is an optional
 * "Preferencias" item (Política de cookies): it's only saved -- and only
 * read -- once that category is accepted. Without it the toggle still works
 * for the visit. Storage can be unavailable (private mode, blocked site
 * data), so every access is guarded.
 */
export const FONT_SCALE_STORAGE_KEY = 'ctcj:font-scale';

export function readStoredFontScale() {
  if (!hasCookieConsent('PREFERENCES')) return 'normal';
  try {
    return window.localStorage.getItem(FONT_SCALE_STORAGE_KEY) === 'large' ? 'large' : 'normal';
  } catch {
    return 'normal';
  }
}

export const FONT_SCALE_EVENT = 'ctcj:fontscalechange';

export function applyFontScale(scale) {
  const isLarge = document.documentElement.dataset.fontScale === 'large';
  if (isLarge === (scale === 'large')) return;
  if (scale === 'large') {
    document.documentElement.dataset.fontScale = 'large';
  } else {
    delete document.documentElement.dataset.fontScale;
  }
  // Lets every mounted FontSizeToggle (e.g. header + menu) stay in sync.
  window.dispatchEvent(new CustomEvent(FONT_SCALE_EVENT, { detail: scale }));
}

function forgetStoredFontScale() {
  try {
    window.localStorage.removeItem(FONT_SCALE_STORAGE_KEY);
  } catch {
    // Nothing stored, or storage blocked.
  }
}

export function storeFontScale(scale) {
  if (scale !== 'large' || !hasCookieConsent('PREFERENCES')) {
    forgetStoredFontScale();
    return;
  }
  try {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'large');
  } catch {
    // Not persisted this time; the on-screen change still applies.
  }
}

/**
 * Called once from main.jsx, before the first render, to avoid a size jump.
 * Also follows the cookie decision: accepting "Preferencias" saves the size
 * in use; refusing or withdrawing it deletes what was saved.
 */
export function initFontScale() {
  if (!hasCookieConsent('PREFERENCES')) forgetStoredFontScale();
  applyFontScale(readStoredFontScale());
  window.addEventListener(COOKIE_CONSENT_EVENT, () => {
    if (hasCookieConsent('PREFERENCES')) {
      storeFontScale(document.documentElement.dataset.fontScale === 'large' ? 'large' : 'normal');
    } else {
      forgetStoredFontScale();
    }
  });
}
