import { CHALLENGE_STATUS } from '@ctcj/shared';

/**
 * Self-service: every challenge the caller is party to, either side, each
 * tagged with the caller's role in it and enriched with the *other*
 * participant's name (never the caller's own name back at them).
 *
 * ACCEPTED challenges are additionally enriched with `matchResult`,
 * translated into "my/opponent" naming relative to the caller -- mirrors
 * `otherParty`'s own caller-relative framing, even though the underlying
 * ChallengeMatchResult is stored in a fixed challenger/opponent frame (see
 * that entity's own docstring).
 *
 * @param {{
 *   challengeRepository: import('../ports/ChallengeRepository.js').ChallengeRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   challengeMatchResultRepository: import('../ports/ChallengeMatchResultRepository.js').ChallengeMatchResultRepository,
 * }} deps
 */
export function createGetMyChallenges({
  challengeRepository,
  playerDirectoryProvider,
  challengeMatchResultRepository,
}) {
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

    const acceptedIds = challenges
      .filter((c) => c.status === CHALLENGE_STATUS.ACCEPTED)
      .map((c) => c.id);
    const resultsByChallengeId = acceptedIds.length
      ? await challengeMatchResultRepository.findByChallengeIds(acceptedIds)
      : new Map();

    const enriched = challenges.map((c) => {
      const isChallenger = c.challengerUserId === userId;
      const otherPartyId = isChallenger ? c.opponentUserId : c.challengerUserId;
      const otherParty = summaries.get(otherPartyId) ?? null;
      const result = resultsByChallengeId.get(c.id) ?? null;

      return {
        ...c,
        role: isChallenger ? 'CHALLENGER' : 'OPPONENT',
        otherParty: otherParty
          ? { id: otherPartyId, firstName: otherParty.firstName, lastName: otherParty.lastName }
          : null,
        matchResult: result ? toMatchResultView(result, isChallenger) : null,
      };
    });

    return { challenges: enriched };
  };
}

function toSubmissionView(submission, isChallenger) {
  if (!submission) {
    return null;
  }
  // Stored frame is always A=challenger/B=opponent, regardless of whose
  // submission this is -- translating to "my/opponent" only depends on the
  // *caller's* role, not on who submitted it.
  return {
    category: submission.category,
    mySetsWon: isChallenger ? submission.setsWonA : submission.setsWonB,
    opponentSetsWon: isChallenger ? submission.setsWonB : submission.setsWonA,
    playedAt: submission.playedAt,
  };
}

function toMatchResultView(result, isChallenger) {
  const mySubmission = isChallenger ? result.challengerSubmission : result.opponentSubmission;
  const opponentSubmission = isChallenger ? result.opponentSubmission : result.challengerSubmission;
  return {
    status: result.status,
    mySubmission: toSubmissionView(mySubmission, isChallenger),
    opponentSubmission: toSubmissionView(opponentSubmission, isChallenger),
    mismatch: result.isFullySubmitted() && !result.submissionsAgree(),
  };
}
