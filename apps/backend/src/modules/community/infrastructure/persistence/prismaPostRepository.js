function toDomain(row) {
  return {
    id: row.id,
    authorId: row.authorId,
    content: row.content,
    createdAt: row.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PostRepository.js').PostRepository}
 */
export function createPrismaPostRepository(prisma) {
  return {
    async create(post) {
      const row = await prisma.communityPost.create({
        data: {
          id: post.id,
          authorId: post.authorId,
          content: post.content,
          createdAt: post.createdAt,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.communityPost.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async listRecent({ limit, before }) {
      const rows = await prisma.communityPost.findMany({
        where: before ? { createdAt: { lt: before } } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { _count: { select: { comments: true, likes: true } } },
      });
      return rows.map((row) => ({
        ...toDomain(row),
        commentCount: row._count.comments,
        likeCount: row._count.likes,
      }));
    },

    async delete(id) {
      // Comments/likes cascade via their real FKs; reports don't (no FK --
      // see the migration's own comment), so they're cleaned up explicitly
      // here, in the same transaction, so a post is never left half-deleted.
      await prisma.$transaction([
        prisma.communityReport.deleteMany({ where: { targetType: 'POST', targetId: id } }),
        prisma.communityPost.delete({ where: { id } }),
      ]);
    },
  };
}
