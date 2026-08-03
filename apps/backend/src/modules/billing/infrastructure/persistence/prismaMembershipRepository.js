import { PlayerMembership } from '../../domain/entities/PlayerMembership.js';

function toDomain(row) {
  return new PlayerMembership({
    id: row.id,
    playerId: row.playerId,
    planId: row.planId,
    startDate: row.startDate,
    endDate: row.endDate,
    billingDay: row.billingDay,
    frequency: row.frequency,
    status: row.status,
    createdAt: row.createdAt,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/MembershipRepository.js').MembershipRepository}
 */
export function createPrismaMembershipRepository(prisma) {
  return {
    async create({ playerId, planId, startDate, billingDay, frequency }) {
      const record = await prisma.playerMembership.create({
        data: { playerId, planId, startDate, billingDay, frequency },
      });
      return toDomain(record);
    },

    async findById(id) {
      const record = await prisma.playerMembership.findUnique({ where: { id } });
      return record ? toDomain(record) : null;
    },

    async update(membership) {
      const record = await prisma.playerMembership.update({
        where: { id: membership.id },
        data: { status: membership.status, endDate: membership.endDate },
      });
      return toDomain(record);
    },

    async listByPlayer(playerId) {
      const records = await prisma.playerMembership.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toDomain);
    },
  };
}
