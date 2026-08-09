import { randomUUID } from 'node:crypto';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PostLikeRepository.js').PostLikeRepository}
 */
export function createPrismaPostLikeRepository(prisma) {
  return {
    async like(postId, userId, now) {
      // upsert on the postId_userId compound key (see schema.prisma's own
      // comment on CommunityPostLike's @@unique) -- atomic, so this is
      // race-safe as a toggle, unlike a find-then-create pair would be.
      await prisma.communityPostLike.upsert({
        where: { postId_userId: { postId, userId } },
        create: { id: randomUUID(), postId, userId, createdAt: now },
        update: {},
      });
    },

    async unlike(postId, userId) {
      await prisma.communityPostLike.deleteMany({ where: { postId, userId } });
    },

    async listLikedPostIds(postIds, userId) {
      const rows = await prisma.communityPostLike.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      });
      return new Set(rows.map((r) => r.postId));
    },
  };
}
