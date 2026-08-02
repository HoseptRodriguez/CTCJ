import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createMeController(container) {
  const getMembershipStatus = asyncHandler(async (req, res) => {
    const result = await container.getMembershipStatus({ userId: req.user.id });
    res.status(200).json(result);
  });

  return { getMembershipStatus };
}
