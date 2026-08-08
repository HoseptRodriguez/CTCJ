const DEFAULT_LIMIT = 10;

/**
 * Coach Dashboard support: a club-wide feed of the most recent coaching
 * activity (notes and skill ratings), across every player and every
 * coach -- matches the existing "any coach, any player, no roster" access
 * policy from Phase 10, so nothing here is scoped to "my players."
 *
 * @param {{
 *   coachNoteRepository: import('../ports/CoachNoteRepository.js').CoachNoteRepository,
 *   performanceRatingRepository: import('../ports/PerformanceRatingRepository.js').PerformanceRatingRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createGetRecentActivity({
  coachNoteRepository,
  performanceRatingRepository,
  playerDirectoryProvider,
}) {
  /** @param {{ limit?: number }} input */
  return async function getRecentActivity({ limit = DEFAULT_LIMIT } = {}) {
    const [notes, ratings] = await Promise.all([
      coachNoteRepository.listRecent(limit),
      performanceRatingRepository.listRecent(limit),
    ]);

    const allIds = [...new Set([...notes, ...ratings].map((row) => row.playerId))];
    const playerSummaries = await playerDirectoryProvider.getPlayerSummaries(allIds);
    function playerName(playerId) {
      const p = playerSummaries.get(playerId);
      return p ? `${p.firstName} ${p.lastName}` : null;
    }

    const feed = [
      ...notes.map((note) => ({
        id: `note-${note.id}`,
        type: 'NOTE',
        playerId: note.playerId,
        playerName: playerName(note.playerId),
        noteType: note.noteType,
        area: note.area,
        at: note.createdAt,
      })),
      ...ratings.map((rating) => ({
        id: `rating-${rating.id}`,
        type: 'RATING',
        playerId: rating.playerId,
        playerName: playerName(rating.playerId),
        area: rating.area,
        rating: rating.rating,
        at: rating.recordedAt,
      })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, limit);

    return { activity: feed };
  };
}
