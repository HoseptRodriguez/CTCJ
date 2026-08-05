import { mapCoachingError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapCoachingError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildCoachingContainer>} container */
export function createMeController(container) {
  const getMyNotes = asyncHandler(async (req, res) => {
    const notes = await container.getMyNotes({ playerId: req.user.id });
    res.status(200).json({ notes });
  });

  return { getMyNotes };
}
