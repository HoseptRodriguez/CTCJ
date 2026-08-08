const MAX_RESULTS = 20;
const MIN_QUERY_LENGTH = 2;

/**
 * Peer-facing player search (Phase 3a) -- "find practice partners" feeds
 * directly into "challenge them" (see the Phase 3a plan). Deliberately
 * different from lookupUserByEmail.js (staff-only, single exact match,
 * returns email): this is reachable by any authenticated user and never
 * returns email, since it's the first genuinely peer-facing lookup in this
 * codebase. A query shorter than MIN_QUERY_LENGTH returns no results rather
 * than the whole JUGADOR roster.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository, clubId: string }} deps
 */
export function createSearchPlayers({ userRepository, clubId }) {
  /** @param {{ query: string }} input */
  return async function searchPlayers({ query }) {
    const trimmed = (query ?? '').trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return { players: [] };
    }
    const players = await userRepository.searchPlayersByName(clubId, trimmed, MAX_RESULTS);
    return { players };
  };
}
