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

  return { createNote, listPlayerNotes };
}
