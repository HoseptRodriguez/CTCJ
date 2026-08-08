export function createFakeNotificationRepository() {
  const byId = new Map();

  return {
    async create(notification) {
      const row = { ...notification, readAt: null, createdAt: new Date() };
      byId.set(row.id, row);
      return row;
    },
    async findById(id) {
      return byId.get(id) ?? null;
    },
    async listByRecipient(recipientId, limit) {
      return Array.from(byId.values())
        .filter((n) => n.recipientId === recipientId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    },
    async countUnreadByRecipient(recipientId) {
      return Array.from(byId.values()).filter((n) => n.recipientId === recipientId && !n.readAt)
        .length;
    },
    async markRead(id, now) {
      const row = byId.get(id);
      row.readAt = now;
      return row;
    },
    async markAllRead(recipientId, now) {
      for (const row of byId.values()) {
        if (row.recipientId === recipientId && !row.readAt) {
          row.readAt = now;
        }
      }
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
