import { mapCoachingError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapCoachingError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildCoachingContainer>} container */
export function createCoachingAdminController(container) {
  const createNote = asyncHandler(async (req, res) => {
    const note = await container.createNote({
      playerId: req.params.id,
      noteType: req.body.noteType,
      visibility: req.body.visibility,
      content: req.body.content,
      coachUserId: req.user.id,
    });
    res.status(201).json(note);
  });

  const listPlayerNotes = asyncHandler(async (req, res) => {
    const notes = await container.listPlayerNotes({ playerId: req.params.id });
    res.status(200).json({ notes });
  });

  const recordPerformanceSnapshot = asyncHandler(async (req, res) => {
    const ratings = await container.recordPerformanceSnapshot({
      playerId: req.params.id,
      ratings: req.body.ratings,
      coachUserId: req.user.id,
    });
    res.status(201).json({ ratings });
  });

  const listPlayerPerformance = asyncHandler(async (req, res) => {
    const result = await container.listPlayerPerformance({ playerId: req.params.id });
    res.status(200).json(result);
  });

  return {
    createNote,
    listPlayerNotes,
    recordPerformanceSnapshot,
    listPlayerPerformance,
  };
}
