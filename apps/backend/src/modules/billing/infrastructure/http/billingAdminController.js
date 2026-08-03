import { mapBillingError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapBillingError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildBillingContainer>} container */
export function createBillingAdminController(container) {
  const listPlans = asyncHandler(async (req, res) => {
    const plans = await container.listPlans();
    res.status(200).json({ plans });
  });

  const createPlan = asyncHandler(async (req, res) => {
    const plan = await container.createPlan({
      code: req.body.code,
      name: req.body.name,
      description: req.body.description,
    });
    res.status(201).json(plan);
  });

  const listPlanPrices = asyncHandler(async (req, res) => {
    const prices = await container.listPlanPrices({ planId: req.params.id });
    res.status(200).json({ prices });
  });

  const setPlanPrice = asyncHandler(async (req, res) => {
    const price = await container.setPlanPrice({
      planId: req.params.id,
      basePriceCop: req.body.basePriceCop,
      validFrom: new Date(req.body.validFrom),
      createdByUserId: req.user.id,
    });
    res.status(200).json(price);
  });

  const enrollPlayer = asyncHandler(async (req, res) => {
    const membership = await container.enrollPlayer({
      playerId: req.body.playerId,
      planId: req.body.planId,
      startDate: new Date(req.body.startDate),
      billingDay: req.body.billingDay,
      frequency: req.body.frequency,
    });
    res.status(201).json(membership);
  });

  const listPlayerMemberships = asyncHandler(async (req, res) => {
    const memberships = await container.listPlayerMemberships({ playerId: req.query.playerId });
    res.status(200).json({ memberships });
  });

  const setPlayerMembershipStatus = asyncHandler(async (req, res) => {
    const membership = await container.setPlayerMembershipStatus({
      membershipId: req.params.id,
      status: req.body.status,
    });
    res.status(200).json(membership);
  });

  const addAdjustment = asyncHandler(async (req, res) => {
    const adjustment = await container.addAdjustment({
      membershipId: req.params.id,
      adjustmentType: req.body.adjustmentType,
      value: req.body.value,
      reason: req.body.reason,
      validFrom: new Date(req.body.validFrom),
      validTo: req.body.validTo ? new Date(req.body.validTo) : undefined,
      authorizedByUserId: req.user.id,
    });
    res.status(201).json(adjustment);
  });

  const listAdjustments = asyncHandler(async (req, res) => {
    const adjustments = await container.listAdjustments({ membershipId: req.params.id });
    res.status(200).json({ adjustments });
  });

  return {
    listPlans,
    createPlan,
    listPlanPrices,
    setPlanPrice,
    enrollPlayer,
    listPlayerMemberships,
    setPlayerMembershipStatus,
    addAdjustment,
    listAdjustments,
  };
}
