import { mapBillingError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapBillingError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildBillingContainer>} container */
export function createMeController(container) {
  const getMyPlayerMemberships = asyncHandler(async (req, res) => {
    const memberships = await container.getMyPlayerMemberships({ playerId: req.user.id });
    res.status(200).json({ memberships });
  });

  const getMyInvoices = asyncHandler(async (req, res) => {
    const invoices = await container.getMyInvoices({ playerId: req.user.id });
    res.status(200).json({ invoices });
  });

  return { getMyPlayerMemberships, getMyInvoices };
}
