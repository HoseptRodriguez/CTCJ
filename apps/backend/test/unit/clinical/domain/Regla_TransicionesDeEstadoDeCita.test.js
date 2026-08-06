import { describe, expect, it } from 'vitest';

import { ClinicalAppointment } from '../../../../src/modules/clinical/domain/entities/ClinicalAppointment.js';
import { InvalidAppointmentState } from '../../../../src/modules/clinical/domain/errors/InvalidAppointmentState.js';

function buildAppointment() {
  return ClinicalAppointment.schedule({
    id: 'appt-1',
    clubId: 'club-1',
    playerId: 'player-1',
    practitionerId: 'psych-1',
    periodStart: new Date('2026-03-01T10:00:00Z'),
    periodEnd: new Date('2026-03-01T11:00:00Z'),
    scheduledBy: 'staff-1',
    now: new Date('2026-02-20'),
  });
}

describe('Regla: transiciones de estado de cita clínica', () => {
  it('a new appointment starts SCHEDULED', () => {
    const appt = buildAppointment();
    expect(appt.status).toBe('SCHEDULED');
  });

  it('cancel() is legal from SCHEDULED', () => {
    const appt = buildAppointment();
    const now = new Date('2026-02-25');
    appt.cancel({ reason: 'jugador no puede asistir', cancelledBy: 'staff-2', now });
    expect(appt.status).toBe('CANCELLED');
    expect(appt.cancelledAt).toBe(now);
    expect(appt.cancelledBy).toBe('staff-2');
    expect(appt.cancelReason).toBe('jugador no puede asistir');
  });

  it('markCompleted() is legal from SCHEDULED', () => {
    const appt = buildAppointment();
    const now = new Date('2026-03-01T11:05:00Z');
    appt.markCompleted({ resolvedBy: 'psych-1', now });
    expect(appt.status).toBe('COMPLETED');
    expect(appt.resolvedAt).toBe(now);
    expect(appt.resolvedBy).toBe('psych-1');
  });

  it('markNoShow() is legal from SCHEDULED', () => {
    const appt = buildAppointment();
    const now = new Date('2026-03-01T11:05:00Z');
    appt.markNoShow({ resolvedBy: 'psych-1', now });
    expect(appt.status).toBe('NO_SHOW');
    expect(appt.resolvedAt).toBe(now);
  });

  it('cancel() throws once already CANCELLED', () => {
    const appt = buildAppointment();
    appt.cancel({ reason: 'x', cancelledBy: 'staff-1', now: new Date() });
    expect(() => appt.cancel({ reason: 'y', cancelledBy: 'staff-1', now: new Date() })).toThrow(
      InvalidAppointmentState,
    );
  });

  it('markCompleted() throws once already COMPLETED', () => {
    const appt = buildAppointment();
    appt.markCompleted({ resolvedBy: 'psych-1', now: new Date() });
    expect(() => appt.markCompleted({ resolvedBy: 'psych-1', now: new Date() })).toThrow(
      InvalidAppointmentState,
    );
  });

  it('markNoShow() throws once already CANCELLED', () => {
    const appt = buildAppointment();
    appt.cancel({ reason: 'x', cancelledBy: 'staff-1', now: new Date() });
    expect(() => appt.markNoShow({ resolvedBy: 'psych-1', now: new Date() })).toThrow(
      InvalidAppointmentState,
    );
  });

  it('markCompleted() throws once already NO_SHOW', () => {
    const appt = buildAppointment();
    appt.markNoShow({ resolvedBy: 'psych-1', now: new Date() });
    expect(() => appt.markCompleted({ resolvedBy: 'psych-1', now: new Date() })).toThrow(
      InvalidAppointmentState,
    );
  });
});
