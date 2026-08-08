import { mapChallengesError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapChallengesError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildChallengesContainer>} container */
export function createMeController(container) {
  const createChallenge = asyncHandler(async (req, res) => {
    const challenge = await container.createChallenge({
      challengerUserId: req.user.id,
      opponentUserId: req.body.opponentUserId,
      message: req.body.message,
    });
    res.status(201).json(challenge);
  });

  const getMyChallenges = asyncHandler(async (req, res) => {
    const result = await container.getMyChallenges({ userId: req.user.id });
    res.status(200).json(result);
  });

  const acceptChallenge = asyncHandler(async (req, res) => {
    const challenge = await container.acceptChallenge({
      userId: req.user.id,
      challengeId: req.params.id,
    });
    res.status(200).json(challenge);
  });

  const rejectChallenge = asyncHandler(async (req, res) => {
    const challenge = await container.rejectChallenge({
      userId: req.user.id,
      challengeId: req.params.id,
    });
    res.status(200).json(challenge);
  });

  const cancelChallenge = asyncHandler(async (req, res) => {
    const challenge = await container.cancelChallenge({
      userId: req.user.id,
      challengeId: req.params.id,
    });
    res.status(200).json(challenge);
  });

  return { createChallenge, getMyChallenges, acceptChallenge, rejectChallenge, cancelChallenge };
}
