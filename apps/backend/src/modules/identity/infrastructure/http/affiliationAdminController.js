import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createAffiliationAdminController(container) {
  const list = asyncHandler(async (req, res) => {
    const result = await container.listAffiliationRequests({ status: req.query.status });
    res.status(200).json({ requests: result });
  });

  const decide = asyncHandler(async (req, res) => {
    const result = await container.decideAffiliationRequest({
      requestId: req.params.id,
      decision: req.body.decision,
      notes: req.body.notes,
      decidedByUserId: req.user.id,
    });
    res.status(200).json(result);
  });

  return { list, decide };
}
