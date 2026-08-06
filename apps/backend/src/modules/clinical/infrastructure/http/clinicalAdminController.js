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
    const result = await container.listPlayerNotes({ playerId: req.params.id });
    res.status(200).json(result);
  });

  return {
    scheduleAppointment,
    cancelAppointment,
    markCompleted,
    markNoShow,
    listAppointments,
    createNote,
    listPlayerNotes,
  };
}
