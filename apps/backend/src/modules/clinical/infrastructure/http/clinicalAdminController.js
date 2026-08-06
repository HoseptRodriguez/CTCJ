import { mapClinicalError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapClinicalError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildClinicalContainer>} container */
export function createClinicalAdminController(container) {
  const scheduleAppointment = asyncHandler(async (req, res) => {
    const appointment = await container.scheduleAppointment({
      playerId: req.body.playerId,
      practitionerId: req.body.practitionerId,
      periodStart: req.body.start,
      periodEnd: req.body.end,
      scheduledByUserId: req.user.id,
    });
    res.status(201).json(appointment);
  });

  const cancelAppointment = asyncHandler(async (req, res) => {
    const appointment = await container.cancelAppointment({
      appointmentId: req.params.id,
      reason: req.body.reason,
      cancelledByUserId: req.user.id,
    });
    res.status(200).json(appointment);
  });

  const markCompleted = asyncHandler(async (req, res) => {
    const appointment = await container.markCompleted({
      appointmentId: req.params.id,
      resolvedByUserId: req.user.id,
    });
    res.status(200).json(appointment);
  });

  const markNoShow = asyncHandler(async (req, res) => {
    const appointment = await container.markNoShow({
      appointmentId: req.params.id,
      resolvedByUserId: req.user.id,
    });
    res.status(200).json(appointment);
  });

  const listAppointments = asyncHandler(async (req, res) => {
    const appointments = await container.listAppointments({
      playerId: req.query.playerId,
      practitionerId: req.query.practitionerId,
    });
    res.status(200).json({ appointments });
  });

  const createNote = asyncHandler(async (req, res) => {
    const note = await container.createNote({
      playerId: req.params.id,
      noteType: req.body.noteType,
      visibility: req.body.visibility,
      content: req.body.content,
      appointmentId: req.body.appointmentId,
      practitionerUserId: req.user.id,
    });
    res.status(201).json(note);
  });

  const listPlayerNotes = asyncHandler(async (req, res) => {
    const result = await container.listPlayerNotes({
      playerId: req.params.id,
      practitionerUserId: req.user.id,
    });
    res.status(200).json(result);
  });

  const createRecoveryPlan = asyncHandler(async (req, res) => {
    const plan = await container.createRecoveryPlan({
      playerId: req.params.id,
      title: req.body.title,
      goal: req.body.goal,
      visibility: req.body.visibility,
      practitionerUserId: req.user.id,
    });
    res.status(201).json(plan);
  });

  const listRecoveryPlans = asyncHandler(async (req, res) => {
    const result = await container.listRecoveryPlans({
      playerId: req.params.id,
      practitionerUserId: req.user.id,
    });
    res.status(200).json(result);
  });

  const completeRecoveryPlan = asyncHandler(async (req, res) => {
    const plan = await container.completeRecoveryPlan({
      planId: req.params.id,
      resolvedByUserId: req.user.id,
    });
    res.status(200).json(plan);
  });

  const discontinueRecoveryPlan = asyncHandler(async (req, res) => {
    const plan = await container.discontinueRecoveryPlan({
      planId: req.params.id,
      reason: req.body.reason,
      resolvedByUserId: req.user.id,
    });
    res.status(200).json(plan);
  });

  const createMedicalHistoryEntry = asyncHandler(async (req, res) => {
    const entry = await container.createMedicalHistoryEntry({
      playerId: req.params.id,
      condition: req.body.condition,
      description: req.body.description,
      visibility: req.body.visibility,
      occurredAt: req.body.occurredAt,
      practitionerUserId: req.user.id,
    });
    res.status(201).json(entry);
  });

  const listMedicalHistory = asyncHandler(async (req, res) => {
    const result = await container.listMedicalHistory({
      playerId: req.params.id,
      practitionerUserId: req.user.id,
    });
    res.status(200).json(result);
  });

  const resolveMedicalHistoryEntry = asyncHandler(async (req, res) => {
    const entry = await container.resolveMedicalHistoryEntry({
      entryId: req.params.id,
      resolvedByUserId: req.user.id,
    });
    res.status(200).json(entry);
  });

  return {
    scheduleAppointment,
    cancelAppointment,
    markCompleted,
    markNoShow,
    listAppointments,
    createNote,
    listPlayerNotes,
    createRecoveryPlan,
    listRecoveryPlans,
    completeRecoveryPlan,
    discontinueRecoveryPlan,
    createMedicalHistoryEntry,
    listMedicalHistory,
    resolveMedicalHistoryEntry,
  };
}
