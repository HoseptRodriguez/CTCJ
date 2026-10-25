import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Deletes all users (cascades to refresh tokens / verifications / user_roles)
 * between tests. Data requests and consents first: they RESTRICT the delete on purpose (in the
 * app the proof of an authorization is never deleted; only tests wipe it).
 */
export async function resetUsers() {
  await prisma.dataSubjectRequest.deleteMany({});
  await prisma.consent.deleteMany({});
  // Role rows first: deleting a user who revoked someone's role would null
  // revoked_by while revoked_at stays, which the coherence CHECK refuses.
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
}
