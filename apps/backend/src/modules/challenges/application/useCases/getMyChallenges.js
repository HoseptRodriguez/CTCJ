/**
 * Self-service: every challenge the caller is party to, either side, each
 * tagged with the caller's role in it and enriched with the *other*
 * participant's name (never the caller's own name back at them).
 *
 * @param {{
 *   challengeRepository: import('../ports/ChallengeRepository.js').ChallengeRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createGetMyChallenges({ challengeRepository, playerDirectoryProvider }) {
  /** @param {{ userId: string }} input */
  return async function getMyChallenges({ userId }) {
    const challenges = await challengeRepository.listByParticipant(userId);
    if (challenges.length === 0) {
      return { challenges: [] };
    }

    const otherPartyIds = [
      ...new Set(
        challenges.map((c) =>
          c.challengerUserId === userId ? c.opponentUserId : c.challengerUserId,
        ),
      ),
    ];
    const summaries = await playerDirectoryProvider.getPlayerSummaries(otherPartyIds);

    const enriched = challenges.map((c) => {
      const isChallenger = c.challengerUserId === userId;
      const otherPartyId = isChallenger ? c.opponentUserId : c.challengerUserId;
      const otherParty = summaries.get(otherPartyId) ?? null;
      return {
        ...c,
        role: isChallenger ? 'CHALLENGER' : 'OPPONENT',
        otherParty: otherParty
          ? { id: otherPartyId, firstName: otherParty.firstName, lastName: otherParty.lastName }
          : null,
      };
    });

    return { challenges: enriched };
  };
}
