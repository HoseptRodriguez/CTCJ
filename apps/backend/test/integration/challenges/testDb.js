import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/** Must run before resetUsers() -- challenges' two user FKs are CASCADE,
 * so this isn't strictly required for FK safety, but keeping it explicit
 * matches every other module's reset-ordering convention. */
export async function resetChallenges() {
  await prisma.challenge.deleteMany({});
}
