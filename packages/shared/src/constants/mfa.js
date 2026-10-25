import { ROLE_CODES } from './roles.js';

/**
 * Two-step verification (TOTP): mandatory for who sees health data or runs
 * the club (Administración, Psicología, Neuropsicología, Fisioterapia);
 * optional for everyone else.
 */
export const MFA_REQUIRED_ROLES = Object.freeze([
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.PSICOLOGO,
  ROLE_CODES.NEUROPSICOLOGO,
  ROLE_CODES.FISIOTERAPEUTA,
]);

export const isMfaRequiredFor = (roles = []) => roles.some((r) => MFA_REQUIRED_ROLES.includes(r));

/** Wrong codes in a row before a temporary lock, and how long it lasts. */
export const MFA_MAX_FAILED_ATTEMPTS = 5;
export const MFA_LOCK_MINUTES = 15;
export const MFA_RECOVERY_CODE_COUNT = 10;
