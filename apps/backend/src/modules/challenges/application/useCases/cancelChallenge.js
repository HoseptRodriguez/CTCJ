import { NOTIFICATION_TYPE } from '@ctcj/shared';

import { ChallengeNotFound } from '../errors/ChallengeNotFound.js';

/**
 * @param {{
 *   challengeRepository: import('../ports/ChallengeRepository.js').ChallengeRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   notificationSender: import('../ports/NotificationSender.js').NotificationSender,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCancelChallenge({
  challengeRepository,
  playerDirectoryProvider,
  notificationSender,
  clock,
}) {
  /** @param {{ userId: string, challengeId: string }} input */
  return async function cancelChallenge({ userId, challengeId }) {
    const challenge = await challengeRepository.findById(challengeId);
    if (!challenge || challenge.challengerUserId !== userId) {
      throw new ChallengeNotFound();
    }

    challenge.cancel(clock.now()); // in-memory guard: throws InvalidChallengeState if not PENDING
    const updated = await challengeRepository.update(challenge);

    const summaries = await playerDirectoryProvider.getPlayerSummaries([userId]);
    const challengerName = summaries.get(userId);
    const challengerLabel = challengerName
      ? `${challengerName.firstName} ${challengerName.lastName}`
      : 'Un jugador';
    await notificationSender.notify({
      recipientId: challenge.opponentUserId,
      type: NOTIFICATION_TYPE.CHALLENGE_CANCELLED,
      title: 'Reto cancelado',
      body: `${challengerLabel} canceló su reto.`,
      linkPath: '/mi-ctcj',
    });

    return updated;
  };
}
