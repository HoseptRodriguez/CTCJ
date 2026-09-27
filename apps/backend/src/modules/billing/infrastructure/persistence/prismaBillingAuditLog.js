import { Prisma } from '@prisma/client';

/**
 * Writes plan and price changes to audit_logs (partitioned, not modeled in
 * schema.prisma -- see the init migration), same approach as clinical's log.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} clubId
 * @returns {import('../../application/ports/BillingAuditLog.js').BillingAuditLog}
 */
export function createPrismaBillingAuditLog(prisma, clubId) {
  return {
    async record({ actorUserId, actorRoles, action, entityType, entityId, before, after }) {
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
