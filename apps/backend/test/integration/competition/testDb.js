import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Must run before resetUsers() -- CompetitionMatchParticipant.player_id is
 * ON DELETE RESTRICT (mirrors coach_notes'/performance_ratings' precedent),
 * so a user with match participations can't be deleted before the matches
 * are. Deleting competitionMatch cascades its participant rows automatically
 * (match_id is ON DELETE CASCADE) -- no separate participant deleteMany
 * needed. Seasons are deleted after matches (season_id is RESTRICT).
 */
export async function resetCompetition() {
  await prisma.competitionMatch.deleteMany({});
  await prisma.competitionSeason.deleteMany({});
}
