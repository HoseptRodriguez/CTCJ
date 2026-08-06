function toRow(record) {
  return {
    id: record.id,
    playerId: record.playerId,
    practitionerId: record.practitionerId,
    discipline: record.discipline,
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
    async create({
      playerId,
      practitionerId,
      discipline,
      appointmentId,
      noteType,
      visibility,
      content,
    }) {
      const record = await prisma.clinicalNote.create({
        data: {
          playerId,
          practitionerId,
          discipline,
          appointmentId,
          noteType,
          visibility,
          content,
        },
      });
      return toRow(record);
    },

    async listByPlayer(playerId, { discipline } = {}) {
      const records = await prisma.clinicalNote.findMany({
        where: { playerId, ...(discipline && { discipline }) },
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
