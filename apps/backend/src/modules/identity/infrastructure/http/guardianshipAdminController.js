import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createGuardianshipAdminController(container) {
  const list = asyncHandler(async (req, res) => {
    const result = await container.listGuardianships({ status: req.query.status });
    res.status(200).json({ guardianships: result });
  });

  const decide = asyncHandler(async (req, res) => {
    const result = await container.decideGuardianship({
      guardianshipId: req.params.id,
      decision: req.body.decision,
      notes: req.body.notes,
      decidedByUserId: req.user.id,
    });
    res.status(200).json(result);
  });

  return { list, decide };
}
