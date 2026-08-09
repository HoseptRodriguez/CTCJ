function toDomain(row) {
  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    content: row.content,
    createdAt: row.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/CommentRepository.js').CommentRepository}
 */
export function createPrismaCommentRepository(prisma) {
  return {
    async create(comment) {
      const row = await prisma.communityComment.create({
        data: {
          id: comment.id,
          postId: comment.postId,
          authorId: comment.authorId,
          content: comment.content,
          createdAt: comment.createdAt,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.communityComment.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async listByPost(postId) {
      const rows = await prisma.communityComment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map(toDomain);
    },

    async delete(id) {
      // Same reasoning as prismaPostRepository.js's delete(): reports have
      // no FK to their target, so cleaning them up is explicit, in the
      // same transaction.
      await prisma.$transaction([
        prisma.communityReport.deleteMany({ where: { targetType: 'COMMENT', targetId: id } }),
        prisma.communityComment.delete({ where: { id } }),
      ]);
    },
  };
}
