import { Prisma } from '@prisma/client';

/**
 * Writes to audit_logs (partitioned, not modeled in schema.prisma -- see the
 * init migration), one row per clinical note read: who (actor + roles),
 * when (occurred_at), which note (entity_id) and about which player.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} clubId
 * @returns {import('../../application/ports/ClinicalAuditLog.js').ClinicalAuditLog}
 */
export function createPrismaClinicalAuditLog(prisma, clubId) {
  return {
    async recordNoteReads({ actorUserId, actorRoles, playerId, noteIds, via }) {
      if (noteIds.length === 0) return;
      const details = JSON.stringify({ playerId, via });
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "audit_logs"
          ("club_id", "actor_user_id", "actor_roles", "action", "entity_type", "entity_id", "after_state")
        SELECT ${clubId}::uuid, ${actorUserId}::uuid, ${actorRoles}::text[],
               'CLINICAL_NOTE_READ', 'clinical_note', note_id, ${details}::jsonb
        FROM unnest(${noteIds}::uuid[]) AS note_id
      `);
    },
  };
}
