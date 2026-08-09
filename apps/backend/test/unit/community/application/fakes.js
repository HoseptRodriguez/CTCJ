export function createFakePostRepository() {
  const byId = new Map();

  return {
    async create(post) {
      const stored = { ...post };
      byId.set(stored.id, stored);
      return { ...stored };
    },
    async findById(id) {
      const row = byId.get(id);
      return row ? { ...row } : null;
    },
    async listRecent({ limit, before }) {
      let rows = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
      if (before) {
        rows = rows.filter((r) => r.createdAt < before);
      }
      return rows.slice(0, limit).map((r) => ({
        commentCount: 0,
        likeCount: 0,
        ...r,
      }));
    },
    async delete(id) {
      byId.delete(id);
    },
    // Test-only: seed a post row directly, optionally with commentCount/
    // likeCount pre-set (real counting is the Prisma repo's job, not
    // re-tested here).
    _seed(post) {
      byId.set(post.id, post);
    },
  };
}

export function createFakeCommentRepository() {
  const byId = new Map();

  return {
    async create(comment) {
      const stored = { ...comment };
      byId.set(stored.id, stored);
      return { ...stored };
    },
    async findById(id) {
      const row = byId.get(id);
      return row ? { ...row } : null;
    },
    async listByPost(postId) {
      return [...byId.values()]
        .filter((c) => c.postId === postId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async delete(id) {
      byId.delete(id);
    },
    _seed(comment) {
      byId.set(comment.id, comment);
    },
  };
}

export function createFakePostLikeRepository() {
  const likes = new Set(); // `${postId}:${userId}`

  return {
    async like(postId, userId) {
      likes.add(`${postId}:${userId}`);
    },
    async unlike(postId, userId) {
      likes.delete(`${postId}:${userId}`);
    },
    async listLikedPostIds(postIds, userId) {
      return new Set(postIds.filter((id) => likes.has(`${id}:${userId}`)));
    },
    _has(postId, userId) {
      return likes.has(`${postId}:${userId}`);
    },
  };
}

export function createFakeReportRepository() {
  const byId = new Map();

  return {
    async create(report) {
      const stored = { status: 'PENDING', resolvedAt: null, resolvedBy: null, ...report };
      byId.set(stored.id, stored);
      return { ...stored };
    },
    async findById(id) {
      const row = byId.get(id);
      return row ? { ...row } : null;
    },
    async findPendingByTarget(targetType, targetId, reporterId) {
      const row = [...byId.values()].find(
        (r) =>
          r.targetType === targetType &&
          r.targetId === targetId &&
          r.reporterId === reporterId &&
          r.status === 'PENDING',
      );
      return row ? { ...row } : null;
    },
    async listByStatus(status) {
      return [...byId.values()]
        .filter((r) => r.status === status)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async dismiss(id, staffUserId, now) {
      const row = byId.get(id);
      row.status = 'DISMISSED';
      row.resolvedAt = now;
      row.resolvedBy = staffUserId;
      return { ...row };
    },
    _seed(report) {
      byId.set(report.id, { status: 'PENDING', resolvedAt: null, resolvedBy: null, ...report });
    },
  };
}

/** @param {Set<string>} eligiblePlayerIds */
export function createFakePlayerEligibilityProvider(eligiblePlayerIds = new Set()) {
  return {
    async isEligiblePlayer(userId) {
      return eligiblePlayerIds.has(userId);
    },
  };
}

/** @param {Map<string, {firstName: string, lastName: string}>} summariesById */
export function createFakePlayerDirectoryProvider(summariesById = new Map()) {
  return {
    async getPlayerSummaries(userIds) {
      const result = new Map();
      for (const id of userIds) {
        if (summariesById.has(id)) {
          result.set(id, summariesById.get(id));
        }
      }
      return result;
    },
  };
}

export function createFakeNotificationSender() {
  const sent = [];
  return {
    sent,
    async notify(notification) {
      sent.push(notification);
    },
  };
}

export function createFakeClock(initial) {
  let current = initial;
  return {
    now: () => current,
    set: (date) => {
      current = date;
    },
  };
}
