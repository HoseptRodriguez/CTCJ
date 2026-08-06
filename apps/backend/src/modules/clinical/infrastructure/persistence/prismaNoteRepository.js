function toRow(record) {
  return {
    id: record.id,
    playerId: record.playerId,
    practitionerId: record.practitionerId,
    appointmentId: record.appointmentId,
    noteType: record.noteType,
    visibility: record.visibility,
    content: record.content,
    createdAt: record.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/NoteRepository.js').NoteRepository}
 */
export function createPrismaNoteRepository(prisma) {
  return {
    async create({ playerId, practitionerId, appointmentId, noteType, visibility, content }) {
      const record = await prisma.clinicalNote.create({
        data: { playerId, practitionerId, appointmentId, noteType, visibility, content },
      });
      return toRow(record);
    },

    async listByPlayer(playerId) {
      const records = await prisma.clinicalNote.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toRow);
    },

    async listVisibleByPlayer(playerId) {
      const records = await prisma.clinicalNote.findMany({
        where: { playerId, visibility: 'PLAYER_VISIBLE' },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toRow);
    },
  };
}
