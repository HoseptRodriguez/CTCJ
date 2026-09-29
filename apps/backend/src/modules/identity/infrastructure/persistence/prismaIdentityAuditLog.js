import { Prisma } from '@prisma/client';

/**
 * Writes staff actions over accounts to audit_logs (partitioned, not modeled
 * in schema.prisma -- same approach as billing's and clinical's logs).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} clubId
 * @returns {import('../../application/ports/IdentityAuditLog.js').IdentityAuditLog}
 */
export function createPrismaIdentityAuditLog(prisma, clubId) {
  return {
    async record({ actorUserId, actorRoles, action, entityType, entityId = null, before, after }) {
      const beforeJson = before == null ? null : JSON.stringify(before);
      const afterJson = after == null ? null : JSON.stringify(after);
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "audit_logs"
          ("club_id", "actor_user_id", "actor_roles", "action", "entity_type", "entity_id",
           "before_state", "after_state")
        VALUES (${clubId}::uuid, ${actorUserId}::uuid, ${actorRoles}::text[], ${action},
                ${entityType}, ${entityId}::uuid, ${beforeJson}::jsonb, ${afterJson}::jsonb)
      `);
    },
  };
}
