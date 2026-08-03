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

  const requestAffiliation = asyncHandler(async (req, res) => {
    const result = await container.requestAffiliation({
      userId: req.user.id,
      notes: req.body.notes,
    });
    res.status(201).json(result);
  });

  const getMyAffiliationRequests = asyncHandler(async (req, res) => {
    const result = await container.getMyAffiliationRequests({ userId: req.user.id });
    res.status(200).json({ requests: result });
  });

  const requestGuardianship = asyncHandler(async (req, res) => {
    const result = await container.requestGuardianship({
      guardianUserId: req.user.id,
      minorEmail: req.body.minorEmail,
      canPay: req.body.canPay,
      canBook: req.body.canBook,
    });
    res.status(201).json(result);
  });

  const listMyGuardianships = asyncHandler(async (req, res) => {
    const result = await container.listMyGuardianships({ guardianUserId: req.user.id });
    res.status(200).json({ guardianships: result });
  });

  return {
    getMembershipStatus,
    requestAffiliation,
    getMyAffiliationRequests,
    requestGuardianship,
    listMyGuardianships,
  };
}
