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
export function createAcceptChallenge({
  challengeRepository,
  playerDirectoryProvider,
  notificationSender,
  clock,
}) {
  /** @param {{ userId: string, challengeId: string }} input */
  return async function acceptChallenge({ userId, challengeId }) {
    const challenge = await challengeRepository.findById(challengeId);
    if (!challenge || challenge.opponentUserId !== userId) {
      throw new ChallengeNotFound();
    }

    challenge.accept(clock.now()); // in-memory guard: throws InvalidChallengeState if not PENDING
    const updated = await challengeRepository.update(challenge);

    const summaries = await playerDirectoryProvider.getPlayerSummaries([userId]);
    const opponentName = summaries.get(userId);
    const opponentLabel = opponentName
      ? `${opponentName.firstName} ${opponentName.lastName}`
      : 'Tu rival';
    await notificationSender.notify({
      recipientId: challenge.challengerUserId,
      type: NOTIFICATION_TYPE.CHALLENGE_ACCEPTED,
      title: 'Reto aceptado',
      body: `${opponentLabel} aceptó tu reto.`,
      linkPath: '/mi-ctcj',
    });

    return updated;
  };
}
