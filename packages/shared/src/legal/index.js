import { MINOR_AUTHORIZATION } from '../constants/consents.js';

import { ACCESSIBILITY_STATEMENT } from './accessibilityStatement.js';
import {
  COMMUNITY_RULES_ACCEPTANCE,
  HEALTH_DATA_AUTHORIZATION,
  MARKETING_AUTHORIZATION,
} from './authorizations.js';
import { COOKIES_POLICY } from './cookiesPolicy.js';
import { PRIVACY_POLICY } from './privacyPolicy.js';
import { REFUNDS_POLICY } from './refundsPolicy.js';
import { TERMS } from './terms.js';

export { BUSINESS } from './business.js';
export { COOKIE_CATEGORY, COOKIE_INVENTORY } from './cookiesPolicy.js';
export { ACCESSIBILITY_STATEMENT, COOKIES_POLICY, PRIVACY_POLICY, REFUNDS_POLICY, TERMS };
export { COMMUNITY_RULES_ACCEPTANCE, HEALTH_DATA_AUTHORIZATION, MARKETING_AUTHORIZATION };

/** The guardian's authorization, as a versioned document like the others. */
export const MINOR_AUTHORIZATION_DOCUMENT = Object.freeze({
  type: 'MINOR_DATA_IMAGE',
  path: null, // shown in the guardian's profile, not as a page
  title: MINOR_AUTHORIZATION.TITLE,
  version: MINOR_AUTHORIZATION.VERSION,
  publishedOn: '2026-09-28',
  sections: [{ id: 'texto', heading: null, blocks: MINOR_AUTHORIZATION.TEXT.map((p) => ({ p })) }],
});

/**
 * Every legal document in force. Each version is stored in the database
 * (legal_documents) with the SHA-256 of its content, so it can be proven
 * which version a person accepted. Changing a text means a new `version`
 * and a new entry in manifest.json (a test enforces it).
 */
export const LEGAL_DOCUMENTS = Object.freeze([
  PRIVACY_POLICY,
  TERMS,
  COOKIES_POLICY,
  REFUNDS_POLICY,
  ACCESSIBILITY_STATEMENT,
  MINOR_AUTHORIZATION_DOCUMENT,
  HEALTH_DATA_AUTHORIZATION,
  COMMUNITY_RULES_ACCEPTANCE,
  MARKETING_AUTHORIZATION,
]);

/** The exact content that is hashed and stored: title + sections, nothing else. */
export function legalDocumentContent(doc) {
  return JSON.stringify({ title: doc.title, sections: doc.sections });
}
