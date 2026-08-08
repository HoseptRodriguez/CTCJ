import { randomUUID } from 'node:crypto';

import { NOTIFICATION_TYPE, CHALLENGE_STATUS } from '@ctcj/shared';

import { ChallengeMatchResult } from '../../domain/entities/ChallengeMatchResult.js';
import { ChallengeNotFound } from '../errors/ChallengeNotFound.js';
import { ChallengeNotAccepted } from '../errors/ChallengeNotAccepted.js';

/**
 * Either player on an ACCEPTED challenge submits their own account of the
 * score. Once both submissions exist and agree, this records a real
 * competition match (via matchRecorder) and completes the challenge --
 * ranking, match history, player profiles, and the activity feed then pick
 * it up automatically, since they all already read from
 * competition_matches. A mismatch just leaves the challenge ACCEPTED so
 * either player can resubmit (submit() overwrites their own prior entry).
 *
 * @param {{
 *   challengeRepository: import('../ports/ChallengeRepository.js').ChallengeRepository,
 *   challengeMatchResultRepository: import('../ports/ChallengeMatchResultRepository.js').ChallengeMatchResultRepository,
 *   matchRecorder: import('../ports/MatchRecorder.js').MatchRecorder,
 *   notificationSender: import('../ports/NotificationSender.js').NotificationSender,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createSubmitMatchScore({
  challengeRepository,
  challengeMatchResultRepository,
  matchRecorder,
  notificationSender,
  clock,
}) {
  /**
   * @param {{ userId: string, challengeId: string, category: string,
   *   mySetsWon: number, opponentSetsWon: number, playedAt: Date }} input
   */
  return async function submitMatchScore({
    userId,
    challengeId,
    category,
    mySetsWon,
    opponentSetsWon,
    playedAt,
  }) {
    const challenge = await challengeRepository.findById(challengeId);
    if (
      !challenge ||
      (challenge.challengerUserId !== userId && challenge.opponentUserId !== userId)
    ) {
      throw new ChallengeNotFound(); // no separate forbidden error, matches accept/reject/cancel's precedent
    }
    if (challenge.status !== CHALLENGE_STATUS.ACCEPTED) {
      throw new ChallengeNotAccepted();
    }

    const side = challenge.challengerUserId === userId ? 'CHALLENGER' : 'OPPONENT';
    // "my sets / their sets" (HTTP-facing) -> fixed A=challenger/B=opponent
    // frame (the same frame CompetitionMatch itself uses).
    const setsWonA = side === 'CHALLENGER' ? mySetsWon : opponentSetsWon;
    const setsWonB = side === 'CHALLENGER' ? opponentSetsWon : mySetsWon;

    const existing = await challengeMatchResultRepository.findByChallengeId(challengeId);
    const isNew = existing === null;
    const result =
      existing ?? ChallengeMatchResult.start({ id: randomUUID(), challengeId, now: clock.now() });
    result.submit({ side, category, setsWonA, setsWonB, playedAt, now: clock.now() });

    const otherUserId =
      side === 'CHALLENGER' ? challenge.opponentUserId : challenge.challengerUserId;

    if (result.isFullySubmitted() && result.submissionsAgree()) {
      const { challengerSubmission } = result;
      const match = await matchRecorder.recordConfirmedMatch({
        category: challengerSubmission.category,
        modality: 'SINGLES',
        participantsA: [challenge.challengerUserId],
        participantsB: [challenge.opponentUserId],
        winnerSide: challengerSubmission.setsWonA > challengerSubmission.setsWonB ? 'A' : 'B',
        setsWonA: challengerSubmission.setsWonA,
        setsWonB: challengerSubmission.setsWonB,
        playedAt: challengerSubmission.playedAt,
        notes: 'Resultado confirmado por ambos jugadores (reto amistoso).',
        recordedByUserId: userId,
      });
      result.confirm({ competitionMatchId: match.id, now: clock.now() });
      challenge.complete(clock.now());

      const saved = isNew
        ? await challengeMatchResultRepository.create(result)
        : await challengeMatchResultRepository.update(result);
      await challengeRepository.update(challenge);

      await notificationSender.notify({
        recipientId: otherUserId,
        type: NOTIFICATION_TYPE.CHALLENGE_RESULT_CONFIRMED,
        title: 'Resultado confirmado',
        body: 'El resultado de tu partido fue confirmado y añadido a tu historial.',
        linkPath: '/mi-ctcj',
      });
      return saved;
    }

    const saved = isNew
      ? await challengeMatchResultRepository.create(result)
      : await challengeMatchResultRepository.update(result);

    if (result.isFullySubmitted()) {
      // Fully submitted but submissionsAgree() was false, or we wouldn't be here.
      await notificationSender.notify({
        recipientId: otherUserId,
        type: NOTIFICATION_TYPE.CHALLENGE_RESULT_MISMATCH,
        title: 'Resultados no coinciden',
        body: 'Los resultados que registraron para su partido no coinciden. Revisa y vuelve a enviarlo.',
        linkPath: '/mi-ctcj',
      });
    } else {
      await notificationSender.notify({
        recipientId: otherUserId,
        type: NOTIFICATION_TYPE.CHALLENGE_RESULT_SUBMITTED,
        title: 'Resultado pendiente de confirmar',
        body: 'Tu rival registró un resultado para su partido. Ingresa el resultado para confirmarlo.',
        linkPath: '/mi-ctcj',
      });
    }
    return saved;
  };
}
