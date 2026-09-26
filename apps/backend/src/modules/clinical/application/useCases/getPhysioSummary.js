import { CLINICAL_CONSENT_SCOPE, FITNESS_STATUS } from '@ctcj/shared';

const PHYSIO = 'PHYSIOTHERAPY';
const RECENT_LIMIT = 5;

/** "YYYY-MM-DD" of a date-only value. */
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/**
 * Operational physiotherapy summary for the club administration: upcoming
 * and recent appointments, attendance, whether a recovery plan is active,
 * and the physiotherapist's "Apto / No apto" status. Deliberately returns
 * NO clinical content: no diagnosis, plan titles/goals or note text.
 *
 * @param {{
 *   appointmentRepository: import('../ports/AppointmentRepository.js').AppointmentRepository,
 *   recoveryPlanRepository: import('../ports/RecoveryPlanRepository.js').RecoveryPlanRepository,
 *   fitnessStatusRepository: import('../ports/FitnessStatusRepository.js').FitnessStatusRepository,
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGetPhysioSummary({
  appointmentRepository,
  recoveryPlanRepository,
  fitnessStatusRepository,
  consentRepository,
  playerDirectoryProvider,
  clock,
}) {
  /** @param {{ playerId: string }} input */
  return async function getPhysioSummary({ playerId }) {
    const now = clock.now();
    const [appointments, plans, fitness, consent] = await Promise.all([
      appointmentRepository.list({ playerId }),
      recoveryPlanRepository.listByPlayer(playerId),
      fitnessStatusRepository.findCurrent(playerId),
      consentRepository.findActive(playerId, CLINICAL_CONSENT_SCOPE.ADMIN_PHYSIO_NOTES),
    ]);

    const physio = appointments.filter((a) => a.discipline === PHYSIO);
    const names = await playerDirectoryProvider.getPlayerSummaries([
      ...new Set(physio.map((a) => a.practitionerId)),
    ]);
    const practitionerName = (id) => {
      const p = names.get(id);
      return p ? `${p.firstName} ${p.lastName}` : null;
    };
    const slim = (a) => ({
      id: a.id,
      periodStart: a.periodStart,
      periodEnd: a.periodEnd,
      status: a.status,
      practitionerName: practitionerName(a.practitionerId),
    });
    const byStart = (a, b) => new Date(a.periodStart) - new Date(b.periodStart);

    const count = (status) => physio.filter((a) => a.status === status).length;
    const completed = count('COMPLETED');
    const noShow = count('NO_SHOW');

    // An UNFIT status whose date already passed no longer applies.
    const today = dayKey(now);
    const until = dayKey(fitness?.unfitUntil);
    const stillUnfit =
      fitness?.status === FITNESS_STATUS.UNFIT && (until === null || until >= today);

    return {
      upcoming: physio
        .filter((a) => a.status === 'SCHEDULED' && new Date(a.periodEnd) >= now)
        .sort(byStart)
        .map(slim),
      recent: physio
        .filter((a) => a.status === 'COMPLETED' || a.status === 'NO_SHOW')
        .sort((a, b) => byStart(b, a))
        .slice(0, RECENT_LIMIT)
        .map(slim),
      attendance: {
        completed,
        noShow,
        cancelled: count('CANCELLED'),
        // Of the sessions that were due, how many the player attended.
        rate: completed + noShow > 0 ? Math.round((completed / (completed + noShow)) * 100) : null,
      },
      hasActiveRecoveryPlan: plans.some((p) => p.status === 'ACTIVE'),
      fitness: fitness
        ? {
            status: stillUnfit ? FITNESS_STATUS.UNFIT : FITNESS_STATUS.FIT,
            recordedStatus: fitness.status,
            unfitUntil: until,
            recordedAt: fitness.createdAt,
          }
        : null,
      notesAccess: { authorized: consent != null, grantedAt: consent?.grantedAt ?? null },
    };
  };
}
