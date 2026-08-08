import { Goal } from '../../domain/entities/Goal.js';

function toDomain(row) {
  return new Goal({
    id: row.id,
    playerId: row.playerId,
    title: row.title,
    metricType: row.metricType,
    targetArea: row.targetArea,
    targetValue: row.targetValue,
    targetCategory: row.targetCategory,
    targetModality: row.targetModality,
    status: row.status,
    createdAt: row.createdAt,
    achievedAt: row.achievedAt,
    abandonedAt: row.abandonedAt,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/GoalRepository.js').GoalRepository}
 */
export function createPrismaGoalRepository(prisma) {
  return {
    async create(goal) {
      const row = await prisma.goal.create({
        data: {
          id: goal.id,
          playerId: goal.playerId,
          title: goal.title,
          metricType: goal.metricType,
          targetArea: goal.targetArea,
          targetValue: goal.targetValue,
          targetCategory: goal.targetCategory,
          targetModality: goal.targetModality,
          status: goal.status,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.goal.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async listByPlayer(playerId) {
      const rows = await prisma.goal.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },

    async update(goal) {
      const row = await prisma.goal.update({
        where: { id: goal.id },
        data: {
          status: goal.status,
          achievedAt: goal.achievedAt,
          abandonedAt: goal.abandonedAt,
        },
      });
      return toDomain(row);
    },
  };
}
