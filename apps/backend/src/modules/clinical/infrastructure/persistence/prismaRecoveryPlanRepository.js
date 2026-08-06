import { RecoveryPlan } from '../../domain/entities/RecoveryPlan.js';

function toDomain(row) {
  return new RecoveryPlan({
    id: row.id,
    playerId: row.playerId,
    practitionerId: row.practitionerId,
    title: row.title,
    goal: row.goal,
    visibility: row.visibility,
    status: row.status,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    discontinueReason: row.discontinueReason,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/RecoveryPlanRepository.js').RecoveryPlanRepository}
 */
export function createPrismaRecoveryPlanRepository(prisma) {
  return {
    async create(plan) {
      const row = await prisma.recoveryPlan.create({
        data: {
          id: plan.id,
          playerId: plan.playerId,
          practitionerId: plan.practitionerId,
          title: plan.title,
          goal: plan.goal,
          visibility: plan.visibility,
          status: plan.status,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.recoveryPlan.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async update(plan) {
      const row = await prisma.recoveryPlan.update({
        where: { id: plan.id },
        data: {
          status: plan.status,
          resolvedAt: plan.resolvedAt,
          resolvedBy: plan.resolvedBy,
          discontinueReason: plan.discontinueReason,
        },
      });
      return toDomain(row);
    },

    async listByPlayer(playerId) {
      const rows = await prisma.recoveryPlan.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },

    async listVisibleByPlayer(playerId) {
      const rows = await prisma.recoveryPlan.findMany({
        where: { playerId, visibility: 'PLAYER_VISIBLE' },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },
  };
}
