function toRow(record) {
  return {
    id: record.id,
    playerId: record.playerId,
    coachId: record.coachId,
    noteType: record.noteType,
    visibility: record.visibility,
    content: record.content,
    area: record.area,
    createdAt: record.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/CoachNoteRepository.js').CoachNoteRepository}
 */
export function createPrismaCoachNoteRepository(prisma) {
  return {
    async create({ playerId, coachId, noteType, visibility, content, area = null }) {
      const record = await prisma.coachNote.create({
        data: { playerId, coachId, noteType, visibility, content, area },
      });
      return toRow(record);
    },

    async listByPlayer(playerId) {
      const records = await prisma.coachNote.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toRow);
    },

    async listVisibleByPlayer(playerId) {
      const records = await prisma.coachNote.findMany({
        where: { playerId, visibility: 'PLAYER_VISIBLE' },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toRow);
    },

    async listRecent(limit) {
      const records = await prisma.coachNote.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return records.map(toRow);
    },
  };
}
