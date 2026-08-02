import { ROLE_CODES } from '@ctcj/shared';

import { mapBookingError } from './errorMapping.js';

const STAFF_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION];

function isStaff(roles = []) {
  return roles.some((role) => STAFF_ROLES.includes(role));
}

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapBookingError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildBookingContainer>} container */
export function createBookingController(container) {
  const listCourts = asyncHandler(async (req, res) => {
    const courts = await container.listCourts();
    res.status(200).json({ courts });
  });

  const getSchedule = asyncHandler(async (req, res) => {
    const viewer = { userId: req.user?.id ?? null, isStaff: isStaff(req.user?.roles) };
    const result = await container.getSchedule({ date: req.query.date, viewer });
    res.status(200).json(result);
  });

  const hold = asyncHandler(async (req, res) => {
    const result = await container.createHold({
      courtId: req.body.courtId,
      periodStart: req.body.start,
      periodEnd: req.body.end,
      holderUserId: req.user.id,
    });
    res.status(201).json(result);
  });

  const confirm = asyncHandler(async (req, res) => {
    const result = await container.confirmReservation({
      reservationId: req.body.reservationId,
      userId: req.user.id,
      isStaff: isStaff(req.user.roles),
    });
    res.status(200).json(result);
  });

  const cancel = asyncHandler(async (req, res) => {
    const result = await container.cancelReservation({
      reservationId: req.params.id,
      userId: req.user.id,
      isStaff: isStaff(req.user.roles),
    });
    res.status(200).json(result);
  });

  const setCourtPrice = asyncHandler(async (req, res) => {
    const result = await container.setCourtPrice({
      courtId: req.params.id,
      priceCop: req.body.priceCop,
    });
    res.status(200).json(result);
  });

  const recordPayment = asyncHandler(async (req, res) => {
    const result = await container.recordPayment({
      reservationId: req.params.id,
      method: req.body.method,
      notes: req.body.notes,
      recordedBy: req.user.id,
    });
    res.status(201).json(result);
  });

  return { listCourts, getSchedule, hold, confirm, cancel, setCourtPrice, recordPayment };
}
