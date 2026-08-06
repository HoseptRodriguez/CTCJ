import { MedicalHistoryEntry } from '../../domain/entities/MedicalHistoryEntry.js';

function toDomain(row) {
  return new MedicalHistoryEntry({
    id: row.id,
    playerId: row.playerId,
    practitionerId: row.practitionerId,
    condition: row.condition,
    description: row.description,
    visibility: row.visibility,
    status: row.status,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/MedicalHistoryRepository.js').MedicalHistoryRepository}
 */
export function createPrismaMedicalHistoryRepository(prisma) {
  return {
    async create(entry) {
      const row = await prisma.medicalHistoryEntry.create({
        data: {
          id: entry.id,
          playerId: entry.playerId,
          practitionerId: entry.practitionerId,
          condition: entry.condition,
          description: entry.description,
          visibility: entry.visibility,
          status: entry.status,
          occurredAt: entry.occurredAt,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.medicalHistoryEntry.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async update(entry) {
      const row = await prisma.medicalHistoryEntry.update({
        where: { id: entry.id },
        data: {
          status: entry.status,
          resolvedAt: entry.resolvedAt,
          resolvedBy: entry.resolvedBy,
        },
      });
      return toDomain(row);
    },

    async listByPlayer(playerId) {
      const rows = await prisma.medicalHistoryEntry.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },

    async listVisibleByPlayer(playerId) {
      const rows = await prisma.medicalHistoryEntry.findMany({
        where: { playerId, visibility: 'PLAYER_VISIBLE' },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },
  };
}
