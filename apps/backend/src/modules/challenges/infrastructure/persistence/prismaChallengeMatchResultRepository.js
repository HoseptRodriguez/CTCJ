import { ChallengeMatchResult } from '../../domain/entities/ChallengeMatchResult.js';

function toSubmission(category, setsWonA, setsWonB, playedAt, submittedAt) {
  if (category === null) {
    return null;
  }
  return { category, setsWonA, setsWonB, playedAt, submittedAt };
}

function toDomain(row) {
  return new ChallengeMatchResult({
    id: row.id,
    challengeId: row.challengeId,
    status: row.status,
    challengerSubmission: toSubmission(
      row.challengerCategory,
      row.challengerSetsWonA,
      row.challengerSetsWonB,
      row.challengerPlayedAt,
      row.challengerSubmittedAt,
    ),
    opponentSubmission: toSubmission(
      row.opponentCategory,
      row.opponentSetsWonA,
      row.opponentSetsWonB,
      row.opponentPlayedAt,
      row.opponentSubmittedAt,
    ),
    competitionMatchId: row.competitionMatchId,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
  });
}

function submissionColumns(prefix, submission) {
  return {
    [`${prefix}Category`]: submission?.category ?? null,
    [`${prefix}SetsWonA`]: submission?.setsWonA ?? null,
    [`${prefix}SetsWonB`]: submission?.setsWonB ?? null,
    [`${prefix}PlayedAt`]: submission?.playedAt ?? null,
    [`${prefix}SubmittedAt`]: submission?.submittedAt ?? null,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/ChallengeMatchResultRepository.js').ChallengeMatchResultRepository}
 */
export function createPrismaChallengeMatchResultRepository(prisma) {
  return {
    async findByChallengeId(challengeId) {
      const row = await prisma.challengeMatchResult.findUnique({ where: { challengeId } });
      return row ? toDomain(row) : null;
    },

    async findByChallengeIds(challengeIds) {
      const rows = await prisma.challengeMatchResult.findMany({
        where: { challengeId: { in: challengeIds } },
      });
      return new Map(rows.map((row) => [row.challengeId, toDomain(row)]));
    },

    async create(result) {
      const row = await prisma.challengeMatchResult.create({
        data: {
          id: result.id,
          challengeId: result.challengeId,
          status: result.status,
          ...submissionColumns('challenger', result.challengerSubmission),
          ...submissionColumns('opponent', result.opponentSubmission),
          competitionMatchId: result.competitionMatchId,
          confirmedAt: result.confirmedAt,
        },
      });
      return toDomain(row);
    },

    async update(result) {
      const row = await prisma.challengeMatchResult.update({
        where: { id: result.id },
        data: {
          status: result.status,
          ...submissionColumns('challenger', result.challengerSubmission),
          ...submissionColumns('opponent', result.opponentSubmission),
          competitionMatchId: result.competitionMatchId,
          confirmedAt: result.confirmedAt,
        },
      });
      return toDomain(row);
    },
  };
}
