export function createFakePostRepository() {
  const byId = new Map();

  return {
    async create(post) {
      const stored = { hiddenAt: null, hiddenReason: null, media: [], ...post };
      byId.set(stored.id, stored);
      return { ...stored };
    },
    async findById(id) {
      const row = byId.get(id);
      return row ? { ...row } : null;
    },
    async listRecent({ limit, before, viewerId }) {
      let rows = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
      if (before) {
        rows = rows.filter((r) => r.createdAt < before);
      }
      rows = rows.filter((r) => !r.hiddenAt || r.authorId === viewerId);
      return rows.slice(0, limit).map((r) => ({
        commentCount: 0,
        likeCount: 0,
        media: [],
        ...r,
      }));
    },
    async delete(id) {
      const row = byId.get(id);
      byId.delete(id);
      return {
        mediaUrls: (row?.media ?? []).flatMap((m) => [m.url, m.posterUrl]).filter(Boolean),
      };
    },
    async countMediaPostsSince(authorId, since) {
      return [...byId.values()].filter(
        (r) => r.authorId === authorId && r.createdAt >= since && (r.media ?? []).length > 0,
      ).length;
    },
    async hide(id, { reason, by, at }) {
      Object.assign(byId.get(id), { hiddenAt: at, hiddenReason: reason, hiddenBy: by });
    },
    async unhide(id) {
      Object.assign(byId.get(id), { hiddenAt: null, hiddenReason: null, hiddenBy: null });
    },
    // Test-only: seed a post row directly, optionally with commentCount/
    // likeCount pre-set (real counting is the Prisma repo's job, not
    // re-tested here).
    _seed(post) {
      byId.set(post.id, { hiddenAt: null, hiddenReason: null, media: [], ...post });
    },
  };
}

/** Storage double: records saves/deletes; `mode` 'local' or 'blob'. */
export function createFakeMediaStorage({ mode = 'local', files = new Map() } = {}) {
  const saved = [];
  const deleted = [];
  return {
    saved,
    deleted,
    files,
    get mode() {
      return mode;
    },
    async save(key, buffer, contentType) {
      const url = `/uploads/${key}`;
      saved.push({ key, url, contentType, size: buffer.length });
      files.set(url, buffer);
      return url;
    },
    ownsUrl(url, userId) {
      return (
        url.startsWith(`/uploads/community/${userId}/`) ||
        url.startsWith(`https://x.public.blob.vercel-storage.com/community/${userId}/`)
      );
    },
    async inspect(url, bytes) {
      const buf = files.get(url);
      return buf ? { sizeBytes: buf.length, head: buf.subarray(0, bytes) } : null;
    },
    async deleteMany(urls) {
      deleted.push(...urls);
    },
  };
}

/** Image processor double: "decodes" anything whose real type is an image. */
export function createFakeImageProcessor() {
  return {
    async toWebp(buffer) {
      if (buffer.toString('latin1').includes('BROKEN')) throw new Error('unreadable');
      return { buffer: Buffer.from('webp'), width: 1600, height: 1200, contentType: 'image/webp' };
    },
  };
}

/** @param {Set<string>} minorIds */
export function createFakeMinorStatusProvider(minorIds = new Set()) {
  return {
    async isMinor(userId) {
      return minorIds.has(userId);
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
    async countPendingByTarget(targetType, targetId) {
      return [...byId.values()].filter(
        (r) => r.targetType === targetType && r.targetId === targetId && r.status === 'PENDING',
      ).length;
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
