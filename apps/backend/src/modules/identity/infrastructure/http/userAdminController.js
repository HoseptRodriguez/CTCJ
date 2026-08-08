import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createUserAdminController(container) {
  const lookup = asyncHandler(async (req, res) => {
    const result = await container.lookupUserByEmail({ email: req.query.email });
    res.status(200).json(result);
  });

  const setMembershipStatus = asyncHandler(async (req, res) => {
    const result = await container.setMembershipStatus({
      targetUserId: req.params.id,
      status: req.body.status,
      updatedByUserId: req.user.id,
    });
    res.status(200).json(result);
  });

  const getPlayerCounts = asyncHandler(async (req, res) => {
    const result = await container.getPlayerCounts();
    res.status(200).json(result);
  });

  return { lookup, setMembershipStatus, getPlayerCounts };
}
