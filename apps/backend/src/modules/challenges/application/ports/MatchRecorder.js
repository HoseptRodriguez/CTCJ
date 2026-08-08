/**
 * Challenges' own narrow window into competition's match-recording concept
 * -- own copy convention still applies: the concrete adapter is the only
 * place allowed to know the competition module exists. Unlike
 * NotificationSender (a "fail open" write -- a missing notification
 * shouldn't block the underlying action), a missing MatchRecorder must
 * fail loud: silently not recording a confirmed result would corrupt data
 * (a CONFIRMED ChallengeMatchResult that doesn't actually exist in
 * competition). See nullAdapters.js.
 */
export class MatchRecorder {
  /**
   * @param {{ category: string, modality: string, participantsA: string[],
   *   participantsB: string[], winnerSide: string, setsWonA: number,
   *   setsWonB: number, playedAt: Date, notes?: string, recordedByUserId: string }} input
   * @returns {Promise<{id: string}>} the created competition match
   */
  async recordConfirmedMatch(_input) {
    throw new Error('Not implemented');
  }
}
