/**
 * "A+ Letra grande" preference. The root <html> gets data-font-scale="large"
 * (styles/tokens.css scales it to 115%), and the choice survives reloads via
 * localStorage. Storage can be unavailable (private mode, blocked site data),
 * so every access is guarded -- the toggle must still work for the session.
 */
export const FONT_SCALE_STORAGE_KEY = 'ctcj:font-scale';

export function readStoredFontScale() {
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

export function storeFontScale(scale) {
  try {
    if (scale === 'large') {
      window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'large');
    } else {
      window.localStorage.removeItem(FONT_SCALE_STORAGE_KEY);
    }
  } catch {
    // Not persisted this time; the on-screen change still applies.
  }
}

/** Called once from main.jsx, before the first render, to avoid a size jump. */
export function initFontScale() {
  applyFontScale(readStoredFontScale());
}
