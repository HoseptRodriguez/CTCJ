import { CLINICAL_CONSENT_SCOPE } from '@ctcj/shared';

import { ClinicalConsentRequired } from '../errors/ClinicalConsentRequired.js';

/**
 * The club administration reads a player's PHYSIOTHERAPY notes -- only while
 * the player's own authorization is active (checked on every request, so a
 * withdrawal takes effect immediately). Every note served is written to the
 * audit log first; if the log can't be written, nothing is served.
 *
 * @param {{
 *   noteRepository: import('../ports/NoteRepository.js').NoteRepository,
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 *   auditLog: import('../ports/ClinicalAuditLog.js').ClinicalAuditLog,
 * }} deps
 */
export function createListPhysioNotesForAdmin({ noteRepository, consentRepository, auditLog }) {
  /** @param {{ playerId: string, actor: { id: string, roles: string[] } }} input */
  return async function listPhysioNotesForAdmin({ playerId, actor }) {
    const consent = await consentRepository.findActive(
      playerId,
      CLINICAL_CONSENT_SCOPE.ADMIN_PHYSIO_NOTES,
    );
    if (!consent) {
      throw new ClinicalConsentRequired();
    }

    const notes = await noteRepository.listByPlayer(playerId, { discipline: 'PHYSIOTHERAPY' });
    await auditLog.recordNoteReads({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      playerId,
      noteIds: notes.map((n) => n.id),
      via: 'ADMIN_WITH_PLAYER_CONSENT',
    });
    return { notes, authorizedAt: consent.grantedAt };
  };
}
