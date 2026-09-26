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

  const getMyRecoveryPlans = asyncHandler(async (req, res) => {
    const result = await container.getMyRecoveryPlans({ playerId: req.user.id });
    res.status(200).json(result);
  });

  const getMyMedicalHistory = asyncHandler(async (req, res) => {
    const result = await container.getMyMedicalHistory({ playerId: req.user.id });
    res.status(200).json(result);
  });

  const getMyPhysioConsent = asyncHandler(async (req, res) => {
    res.status(200).json(await container.getMyPhysioConsent({ playerId: req.user.id }));
  });

  const grantMyPhysioConsent = asyncHandler(async (req, res) => {
    res.status(200).json(await container.grantMyPhysioConsent({ playerId: req.user.id }));
  });

  const revokeMyPhysioConsent = asyncHandler(async (req, res) => {
    res.status(200).json(await container.revokeMyPhysioConsent({ playerId: req.user.id }));
  });

  return {
    getMyAppointments,
    getMyNotes,
    getMyRecoveryPlans,
    getMyMedicalHistory,
    getMyPhysioConsent,
    grantMyPhysioConsent,
    revokeMyPhysioConsent,
  };
}
