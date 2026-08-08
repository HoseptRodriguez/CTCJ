export function createFakeGoalRepository() {
  const byId = new Map();

  return {
    async create(goal) {
      byId.set(goal.id, goal);
      return goal;
    },
    async findById(id) {
      return byId.get(id) ?? null;
    },
    async listByPlayer(playerId) {
      return Array.from(byId.values())
        .filter((g) => g.playerId === playerId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async update(goal) {
      byId.set(goal.id, goal);
      return goal;
    },
  };
}

/** @param {{hasSeason?: boolean, categories?: Array}} fixture */
export function createFakeCompetitionProgressProvider(fixture = {}) {
  return {
    async getMySummary() {
      return { hasSeason: false, categories: [], recentMatches: [], ...fixture };
    },
  };
}

/** @param {Record<string, number>} latestByArea */
export function createFakePerformanceProgressProvider(latestByArea = {}) {
  return {
    async getMyPerformance() {
      return { ratings: [], summary: { ratedAreas: [], progressByArea: {}, latestByArea } };
    },
  };
}

/** @param {number} count */
export function createFakeTrainingFrequencyProvider(count = 0) {
  return {
    async getMyTrainingFrequency() {
      return { count };
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
