import { COOKIES_POLICY } from '@ctcj/shared';

/**
 * The visitor's decision about cookies and browser storage. Stored (as a
 * strictly necessary item, listed in the policy) with the date and the
 * policy version: when the policy changes, the decision no longer counts
 * and the banner asks again.
 *
 * Nothing optional is saved before the matching category is accepted; see
 * fontScale.js for the only optional item today ("Letra grande").
 */
export const COOKIE_CONSENT_KEY = 'ctcj:cookie-consent';
export const COOKIE_CONSENT_EVENT = 'ctcj:cookie-consent-changed';

/** @returns {{ version: string, decidedAt: string, preferences: boolean, analytics: boolean, recordedFor?: string|null }|null} */
export function readCookieConsent() {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const decision = JSON.parse(raw);
    // A decision about an older policy doesn't count: ask again.
    if (decision?.version !== COOKIES_POLICY.version) return null;
    return {
      version: decision.version,
      decidedAt: decision.decidedAt,
      preferences: decision.preferences === true,
      analytics: decision.analytics === true,
      recordedFor: decision.recordedFor ?? null,
    };
  } catch {
    return null;
  }
}

/** Whether an optional category may be used right now. Necessary items are always allowed. */
export function hasCookieConsent(category) {
  if (category === 'NECESSARY') return true;
  const decision = readCookieConsent();
  if (!decision) return false;
  if (category === 'PREFERENCES') return decision.preferences;
  if (category === 'ANALYTICS') return decision.analytics;
  return false;
}

/**
 * Saves the decision (with its date and the policy version) and tells the
 * rest of the page. Returns it.
 * @param {{ preferences: boolean, analytics: boolean }} choice
 */
export function saveCookieConsent({ preferences, analytics }) {
  const decision = {
    version: COOKIES_POLICY.version,
    decidedAt: new Date().toISOString(),
    preferences: Boolean(preferences),
    analytics: Boolean(analytics),
    recordedFor: null,
  };
  writeDecision(decision);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: decision }));
  return decision;
}

/** Remembers that this decision was already recorded as proof for this user. */
export function markCookieConsentRecorded(userId) {
  const decision = readCookieConsent();
  if (decision) writeDecision({ ...decision, recordedFor: userId });
}

function writeDecision(decision) {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(decision));
  } catch {
    // Storage blocked: the choice applies to this visit only.
  }
}
