import { CLINICAL_CONSENT_SCOPE } from '@ctcj/shared';

const SCOPE = CLINICAL_CONSENT_SCOPE.ADMIN_PHYSIO_NOTES;

function view(row) {
  return {
    authorized: row != null && row.revokedAt == null,
    grantedAt: row?.grantedAt ?? null,
    revokedAt: row?.revokedAt ?? null,
  };
}

/**
 * The player's own "Autorizo a la administración del club a ver mis notas
 * de fisioterapia" switch. Only ever about the caller themself.
 *
 * @param {{
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createClinicalConsentUseCases({ consentRepository, clock }) {
  return {
    /** @param {{ playerId: string }} input */
    async getMyPhysioConsent({ playerId }) {
      return view(await consentRepository.findLatest(playerId, SCOPE));
    },

    /** Idempotent: granting while already authorized keeps the original date. */
    async grantMyPhysioConsent({ playerId }) {
      const active = await consentRepository.findActive(playerId, SCOPE);
      if (!active) await consentRepository.grant(playerId, SCOPE, clock.now());
      return view(await consentRepository.findLatest(playerId, SCOPE));
    },

    /** Idempotent: withdrawing when not authorized is a no-op. */
    async revokeMyPhysioConsent({ playerId }) {
      await consentRepository.revoke(playerId, SCOPE, clock.now());
      return view(await consentRepository.findLatest(playerId, SCOPE));
    },
  };
}
