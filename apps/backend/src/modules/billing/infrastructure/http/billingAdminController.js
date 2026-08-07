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

  const generateInvoice = asyncHandler(async (req, res) => {
    const invoice = await container.generateInvoice({
      membershipId: req.params.id,
      periodStart: new Date(req.body.periodStart),
      periodEnd: new Date(req.body.periodEnd),
      dueDate: new Date(req.body.dueDate),
      generatedByUserId: req.user.id,
    });
    res.status(201).json(invoice);
  });

  const listInvoicesByMembership = asyncHandler(async (req, res) => {
    const invoices = await container.listInvoicesByMembership({ membershipId: req.params.id });
    res.status(200).json({ invoices });
  });

  const getInvoice = asyncHandler(async (req, res) => {
    const invoice = await container.getInvoice({ invoiceId: req.params.id });
    res.status(200).json(invoice);
  });

  const recordInvoicePayment = asyncHandler(async (req, res) => {
    const invoice = await container.recordInvoicePayment({
      invoiceId: req.params.id,
      method: req.body.method,
      notes: req.body.notes,
      recordedByUserId: req.user.id,
    });
    res.status(200).json(invoice);
  });

  const cancelInvoice = asyncHandler(async (req, res) => {
    const invoice = await container.cancelInvoice({
      invoiceId: req.params.id,
      cancelledByUserId: req.user.id,
      reason: req.body.reason,
    });
    res.status(200).json(invoice);
  });

  const listInvoices = asyncHandler(async (req, res) => {
    const result = await container.listInvoices({
      status: req.query.status,
      paidFrom: req.query.from,
      paidTo: req.query.to,
    });
    res.status(200).json(result);
  });

  const getMonthlyRevenue = asyncHandler(async (req, res) => {
    const result = await container.getMonthlyRevenue({ months: req.query.months });
    res.status(200).json(result);
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
    generateInvoice,
    listInvoicesByMembership,
    getInvoice,
    recordInvoicePayment,
    cancelInvoice,
    listInvoices,
    getMonthlyRevenue,
  };
}
