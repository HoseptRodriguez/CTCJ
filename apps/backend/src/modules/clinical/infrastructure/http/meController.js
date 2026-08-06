import { mapClinicalError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapClinicalError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildClinicalContainer>} container */
export function createMeController(container) {
  const getMyAppointments = asyncHandler(async (req, res) => {
    const appointments = await container.getMyAppointments({ playerId: req.user.id });
    res.status(200).json({ appointments });
  });

  const getMyNotes = asyncHandler(async (req, res) => {
    const result = await container.getMyNotes({ playerId: req.user.id });
    res.status(200).json(result);
  });

  return { getMyAppointments, getMyNotes };
}
