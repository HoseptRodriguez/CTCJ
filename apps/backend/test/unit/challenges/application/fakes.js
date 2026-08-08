export function createFakeChallengeRepository() {
  const byId = new Map();

  return {
    async create(challenge) {
      byId.set(challenge.id, challenge);
      return challenge;
    },
    async findById(id) {
      return byId.get(id) ?? null;
    },
    async findActiveBetween(userIdA, userIdB) {
      for (const c of byId.values()) {
        if (
          c.status === 'PENDING' &&
          ((c.challengerUserId === userIdA && c.opponentUserId === userIdB) ||
            (c.challengerUserId === userIdB && c.opponentUserId === userIdA))
        ) {
          return c;
        }
      }
      return null;
    },
    async listByParticipant(userId) {
      return Array.from(byId.values())
        .filter((c) => c.challengerUserId === userId || c.opponentUserId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async update(challenge) {
      byId.set(challenge.id, challenge);
      return challenge;
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
