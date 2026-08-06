import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Must run before resetUsers() -- tournament_participant_members.player_id
 * is ON DELETE RESTRICT. Deleting tournament cascades matches and
 * participants (and participant members) automatically -- no separate
 * deleteMany calls needed for those.
 */
export async function resetTournament() {
  await prisma.tournament.deleteMany({});
}
