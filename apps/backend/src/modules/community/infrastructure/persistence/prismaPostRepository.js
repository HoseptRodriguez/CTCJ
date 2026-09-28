function toMedia(m) {
  return {
    id: m.id,
    type: m.type,
    url: m.url,
    posterUrl: m.posterUrl,
    width: m.width,
    height: m.height,
    durationSeconds: m.durationSeconds == null ? null : Number(m.durationSeconds),
    sortOrder: m.sortOrder,
  };
}

function toDomain(row) {
  return {
    id: row.id,
    authorId: row.authorId,
    content: row.content,
    createdAt: row.createdAt,
    hiddenAt: row.hiddenAt ?? null,
    hiddenReason: row.hiddenReason ?? null,
    media: (row.media ?? []).map(toMedia),
  };
}

const withMedia = { media: { orderBy: { sortOrder: 'asc' } } };

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
          ...(post.media?.length
            ? {
                media: {
                  create: post.media.map((m) => ({
                    id: m.id,
                    type: m.type,
                    url: m.url,
                    posterUrl: m.posterUrl ?? null,
                    width: m.width ?? null,
                    height: m.height ?? null,
                    durationSeconds: m.durationSeconds ?? null,
                    sortOrder: m.sortOrder,
                    createdAt: post.createdAt,
                  })),
                },
              }
            : {}),
        },
        include: withMedia,
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.communityPost.findUnique({ where: { id }, include: withMedia });
      return row ? toDomain(row) : null;
    },

    async listRecent({ limit, before, viewerId }) {
      const visible = viewerId
        ? { OR: [{ hiddenAt: null }, { authorId: viewerId }] }
        : { hiddenAt: null };
      const rows = await prisma.communityPost.findMany({
        where: { AND: [visible, before ? { createdAt: { lt: before } } : {}] },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { ...withMedia, _count: { select: { comments: true, likes: true } } },
      });
      return rows.map((row) => ({
        ...toDomain(row),
        commentCount: row._count.comments,
        likeCount: row._count.likes,
      }));
    },

    async delete(id) {
      const media = await prisma.postMedia.findMany({
        where: { postId: id },
        select: { url: true, posterUrl: true },
      });
      // Comments/likes/post_media cascade via their real FKs; reports don't
      // (no FK -- see the migration's own comment), so they're cleaned up
      // explicitly here, in the same transaction, so a post is never left
      // half-deleted.
      await prisma.$transaction([
        prisma.communityReport.deleteMany({ where: { targetType: 'POST', targetId: id } }),
        prisma.communityPost.delete({ where: { id } }),
      ]);
      return { mediaUrls: media.flatMap((m) => [m.url, m.posterUrl]).filter(Boolean) };
    },

    async eraseAuthor(authorId) {
      const posts = await prisma.communityPost.findMany({
        where: { authorId },
        select: { id: true, media: { select: { url: true, posterUrl: true } } },
      });
      const postIds = posts.map((p) => p.id);
      const commentIds = (
        await prisma.communityComment.findMany({ where: { authorId }, select: { id: true } })
      ).map((c) => c.id);
      // Everything of the person, in one transaction: reports about their
      // content (no FK), their comments, their posts (others' comments and
      // likes on them cascade), their likes and their own reports.
      await prisma.$transaction([
        prisma.communityReport.deleteMany({
          where: {
            OR: [
              { targetType: 'POST', targetId: { in: postIds } },
              { targetType: 'COMMENT', targetId: { in: commentIds } },
              { reporterId: authorId },
            ],
          },
        }),
        prisma.communityComment.deleteMany({ where: { authorId } }),
        prisma.communityPost.deleteMany({ where: { authorId } }),
        prisma.communityPostLike.deleteMany({ where: { userId: authorId } }),
      ]);
      return {
        posts: postIds.length,
        comments: commentIds.length,
        mediaUrls: posts
          .flatMap((p) => p.media.flatMap((m) => [m.url, m.posterUrl]))
          .filter(Boolean),
      };
    },

    async countMediaPostsSince(authorId, since) {
      return prisma.communityPost.count({
        where: { authorId, createdAt: { gte: since }, media: { some: {} } },
      });
    },

    async hide(id, { reason, by, at }) {
      await prisma.communityPost.update({
        where: { id },
        data: { hiddenAt: at, hiddenReason: reason, hiddenBy: by },
      });
    },

    async unhide(id) {
      await prisma.communityPost.update({
        where: { id },
        data: { hiddenAt: null, hiddenReason: null, hiddenBy: null },
      });
    },
  };
}
