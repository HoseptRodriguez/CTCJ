import { randomUUID } from 'node:crypto';

import { NOTIFICATION_TYPE } from '@ctcj/shared';

import { Challenge } from '../../domain/entities/Challenge.js';
import { SelfChallengeForbidden } from '../errors/SelfChallengeForbidden.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { ChallengeAlreadyPending } from '../errors/ChallengeAlreadyPending.js';

/**
 * @param {{
 *   challengeRepository: import('../ports/ChallengeRepository.js').ChallengeRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   notificationSender: import('../ports/NotificationSender.js').NotificationSender,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCreateChallenge({
  challengeRepository,
  playerEligibilityProvider,
  playerDirectoryProvider,
  notificationSender,
  clock,
}) {
  /** @param {{ challengerUserId: string, opponentUserId: string, message?: string }} input */
  return async function createChallenge({ challengerUserId, opponentUserId, message }) {
    if (challengerUserId === opponentUserId) {
      throw new SelfChallengeForbidden();
    }

    const [challengerEligible, opponentEligible] = await Promise.all([
      playerEligibilityProvider.isEligiblePlayer(challengerUserId),
      playerEligibilityProvider.isEligiblePlayer(opponentUserId),
    ]);
    if (!challengerEligible || !opponentEligible) {
      throw new PlayerNotEligible();
    }

    const existing = await challengeRepository.findActiveBetween(challengerUserId, opponentUserId);
    if (existing) {
      throw new ChallengeAlreadyPending();
    }

    const challenge = Challenge.create({
      id: randomUUID(),
      challengerUserId,
      opponentUserId,
      message,
      now: clock.now(),
    });
    const created = await challengeRepository.create(challenge);

    const summaries = await playerDirectoryProvider.getPlayerSummaries([challengerUserId]);
    const challengerName = summaries.get(challengerUserId);
    const challengerLabel = challengerName
      ? `${challengerName.firstName} ${challengerName.lastName}`
      : 'Un jugador';
    await notificationSender.notify({
      recipientId: opponentUserId,
      type: NOTIFICATION_TYPE.CHALLENGE_RECEIVED,
      title: 'Nuevo reto',
      body: `${challengerLabel} te retó a un partido.`,
      linkPath: '/mi-ctcj',
    });

    return created;
  };
}
