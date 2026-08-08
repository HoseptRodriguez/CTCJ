import { Challenge } from '../../domain/entities/Challenge.js';

function toDomain(row) {
  return new Challenge({
    id: row.id,
    challengerUserId: row.challengerUserId,
    opponentUserId: row.opponentUserId,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
    completedAt: row.completedAt,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/ChallengeRepository.js').ChallengeRepository}
 */
export function createPrismaChallengeRepository(prisma) {
  return {
    async create(challenge) {
      const row = await prisma.challenge.create({
        data: {
          id: challenge.id,
          challengerUserId: challenge.challengerUserId,
          opponentUserId: challenge.opponentUserId,
          message: challenge.message,
          status: challenge.status,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.challenge.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async findActiveBetween(userIdA, userIdB) {
      const row = await prisma.challenge.findFirst({
        where: {
          status: 'PENDING',
          OR: [
            { challengerUserId: userIdA, opponentUserId: userIdB },
            { challengerUserId: userIdB, opponentUserId: userIdA },
          ],
        },
      });
      return row ? toDomain(row) : null;
    },

    async listByParticipant(userId) {
      const rows = await prisma.challenge.findMany({
        where: { OR: [{ challengerUserId: userId }, { opponentUserId: userId }] },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },

    async update(challenge) {
      const row = await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          status: challenge.status,
          respondedAt: challenge.respondedAt,
          completedAt: challenge.completedAt,
        },
      });
      return toDomain(row);
    },
  };
}
