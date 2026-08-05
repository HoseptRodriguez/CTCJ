import { CompetitionSeason } from '../../domain/entities/CompetitionSeason.js';

function toDomain(record) {
  return new CompetitionSeason({
    id: record.id,
    clubId: record.clubId,
    name: record.name,
    year: record.year,
    seasonNumber: record.seasonNumber,
    status: record.status,
    startDate: record.startDate,
    endDate: record.endDate,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    closedAt: record.closedAt,
    closedBy: record.closedBy,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/SeasonRepository.js').SeasonRepository}
 */
export function createPrismaSeasonRepository(prisma) {
  return {
    async create(season) {
      const record = await prisma.competitionSeason.create({
        data: {
          id: season.id,
          clubId: season.clubId,
          name: season.name,
          year: season.year,
          seasonNumber: season.seasonNumber,
          status: season.status,
          startDate: season.startDate,
          createdBy: season.createdBy,
        },
      });
      return toDomain(record);
    },

    async findById(id) {
      const record = await prisma.competitionSeason.findUnique({ where: { id } });
      return record ? toDomain(record) : null;
    },

    async findOpenByClub(clubId) {
      const record = await prisma.competitionSeason.findFirst({
        where: { clubId, status: 'OPEN' },
      });
      return record ? toDomain(record) : null;
    },

    async listByClub(clubId) {
      const records = await prisma.competitionSeason.findMany({
        where: { clubId },
        orderBy: [{ year: 'desc' }, { seasonNumber: 'desc' }],
      });
      return records.map(toDomain);
    },

    async update(season) {
      const record = await prisma.competitionSeason.update({
        where: { id: season.id },
        data: {
          status: season.status,
          closedAt: season.closedAt,
          closedBy: season.closedBy,
        },
      });
      return toDomain(record);
    },
  };
}
