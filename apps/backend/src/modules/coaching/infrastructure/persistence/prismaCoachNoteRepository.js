import { randomUUID } from 'node:crypto';

import { writeOutboxEvent } from '../../../../shared/outbox.js';

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
    /**
     * `eventsFor(note)`: outbox events to write in the same transaction
     * (a note visible to the player tells the player).
     */
    async create({ playerId, coachId, noteType, visibility, content, area = null, eventsFor }) {
      const id = randomUUID();
      const [record] = await prisma.$transaction([
        prisma.coachNote.create({
          data: { id, playerId, coachId, noteType, visibility, content, area },
        }),
        ...(eventsFor ? eventsFor({ id, playerId }) : []).map((e) => writeOutboxEvent(prisma, e)),
      ]);
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
