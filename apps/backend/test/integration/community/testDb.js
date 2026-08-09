import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/** Must run before resetUsers() -- community's FKs to users are all
 * CASCADE, so this isn't strictly required for FK safety, but keeping it
 * explicit matches every other module's reset-ordering convention.
 * Reports have no FK to their target (see the migration's own comment),
 * so deleting posts doesn't cascade them away -- reset both explicitly. */
export async function resetCommunity() {
  await prisma.communityReport.deleteMany({});
  await prisma.communityPost.deleteMany({});
}
