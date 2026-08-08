import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../api/affiliationClient.js';
import { billingClient } from '../api/billingClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { challengesClient } from '../api/challengesClient.js';
import { clinicalClient } from '../api/clinicalClient.js';
import { coachingClient } from '../api/coachingClient.js';
import { competitionClient } from '../api/competitionClient.js';
import { goalsClient } from '../api/goalsClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { tournamentClient } from '../api/tournamentClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { MyCtcjPage } from './MyCtcjPage.jsx';

function renderPage() {
  return render(
    <MemoryRouter>
      <MyCtcjPage />
    </MemoryRouter>,
  );
}

vi.mock('../api/bookingClient.js', () => ({
  bookingClient: { getSchedule: vi.fn() },
}));

vi.mock('../api/membershipClient.js', () => ({
  membershipClient: { getMyStatus: vi.fn(), getMyProfile: vi.fn(), searchPlayers: vi.fn() },
}));

vi.mock('../api/challengesClient.js', () => ({
  challengesClient: {
    createChallenge: vi.fn(),
    getMyChallenges: vi.fn(),
    acceptChallenge: vi.fn(),
    rejectChallenge: vi.fn(),
    cancelChallenge: vi.fn(),
    submitMatchScore: vi.fn(),
  },
}));

vi.mock('../api/competitionClient.js', () => ({
  competitionClient: { getMyCompetitionSummary: vi.fn(), getRecentClubMatches: vi.fn() },
}));

vi.mock('../api/tournamentClient.js', () => ({
  tournamentClient: { listTournaments: vi.fn() },
}));

vi.mock('../api/goalsClient.js', () => ({
  goalsClient: { getMyGoals: vi.fn(), createGoal: vi.fn(), abandonGoal: vi.fn() },
}));

vi.mock('../api/affiliationClient.js', () => ({
  affiliationClient: { getMyRequests: vi.fn(), submitRequest: vi.fn() },
}));

vi.mock('../api/guardianshipClient.js', () => ({
  guardianshipClient: { listMine: vi.fn(), requestGuardianship: vi.fn() },
}));

vi.mock('../api/billingClient.js', () => ({
  billingClient: { getMyMemberships: vi.fn(), getMyInvoices: vi.fn() },
}));

vi.mock('../api/coachingClient.js', () => ({
  coachingClient: { getMyNotes: vi.fn(), getMyPerformance: vi.fn() },
}));

vi.mock('../api/clinicalClient.js', () => ({
  clinicalClient: {
    getMyAppointments: vi.fn(),
    getMyNotes: vi.fn(),
    getMyRecoveryPlans: vi.fn(),
    getMyMedicalHistory: vi.fn(),
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

describe('MyCtcjPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockResolvedValue({ reservations: [] });
    affiliationClient.getMyRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listMine.mockResolvedValue({ guardianships: [] });
    billingClient.getMyMemberships.mockResolvedValue({ memberships: [] });
    billingClient.getMyInvoices.mockResolvedValue({ invoices: [] });
    coachingClient.getMyNotes.mockResolvedValue({ notes: [] });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [],
      summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} },
    });
    clinicalClient.getMyAppointments.mockResolvedValue({ appointments: [] });
    clinicalClient.getMyNotes.mockResolvedValue({ notes: [] });
    clinicalClient.getMyRecoveryPlans.mockResolvedValue({ plans: [] });
    clinicalClient.getMyMedicalHistory.mockResolvedValue({ entries: [] });
    membershipClient.getMyProfile.mockResolvedValue({
      id: 'u1',
      firstName: 'Ana',
      lastName: 'Gomez',
      email: 'ana@example.com',
    });
    competitionClient.getMyCompetitionSummary.mockResolvedValue({
      hasSeason: false,
      categories: [],
      recentMatches: [],
    });
    goalsClient.getMyGoals.mockResolvedValue({ goals: [] });
    challengesClient.getMyChallenges.mockResolvedValue({ challenges: [] });
    competitionClient.getRecentClubMatches.mockResolvedValue({ matches: [] });
    tournamentClient.listTournaments.mockResolvedValue({ tournaments: [] });
  });

  it('shows a JUGADOR their own membership status', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: 'OVERDUE' });

    renderPage();

    expect(await screen.findByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Estado de membresía:')).toBeInTheDocument();
  });

  it('shows "Sin membresía" for a JUGADOR not yet enrolled (null status)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Sin membresía')).toBeInTheDocument();
  });

  it('never shows a membership status for a plain USUARIO', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Estado de membresía:')).not.toBeInTheDocument();
  });

  it('a plain USUARIO sees the affiliation request form and can submit it', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    affiliationClient.submitRequest.mockResolvedValue({ id: 'req-1', status: 'PENDING' });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Afiliación a la academia')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Solicitar afiliación' }));

    await waitFor(() =>
      expect(affiliationClient.submitRequest).toHaveBeenCalledWith({ notes: undefined }),
    );
  });

  it('a JUGADOR does not see the affiliation section', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Afiliación a la academia')).not.toBeInTheDocument();
  });

  it('can request a guardianship link and see it listed', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    guardianshipClient.requestGuardianship.mockResolvedValue({ id: 'g1', status: 'PENDING' });
    guardianshipClient.listMine.mockResolvedValueOnce({ guardianships: [] }).mockResolvedValueOnce({
      guardianships: [{ id: 'g1', minorEmail: 'hijo@example.com', status: 'PENDING' }],
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Cuentas vinculadas')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Correo del menor'), 'hijo@example.com');
    await user.click(screen.getByRole('button', { name: 'Solicitar vinculación' }));

    await waitFor(() =>
      expect(guardianshipClient.requestGuardianship).toHaveBeenCalledWith({
        minorEmail: 'hijo@example.com',
        canPay: false,
        canBook: true,
      }),
    );
    expect(await screen.findByText('hijo@example.com')).toBeInTheDocument();
  });

  it('a JUGADOR with an active plan sees "Mi plan"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    billingClient.getMyMemberships.mockResolvedValue({
      memberships: [{ id: 'm1', planName: 'Iniciación', currentPriceCop: 50000, status: 'ACTIVE' }],
    });

    renderPage();

    expect(await screen.findByText('Mi plan')).toBeInTheDocument();
    expect(screen.getByText('Iniciación')).toBeInTheDocument();
  });

  it('does not show "Mi plan" when there are no memberships', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(billingClient.getMyMemberships).toHaveBeenCalled());
    expect(screen.queryByText('Mi plan')).not.toBeInTheDocument();
  });

  it('shows the player their own invoices, read-only, under "Mi plan"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    billingClient.getMyMemberships.mockResolvedValue({
      memberships: [{ id: 'm1', planName: 'Iniciación', currentPriceCop: 50000, status: 'ACTIVE' }],
    });
    billingClient.getMyInvoices.mockResolvedValue({
      invoices: [
        {
          id: 'inv1',
          membershipId: 'm1',
          status: 'PENDING',
          amountCop: 50000,
          dueDate: '2026-03-05',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mi plan')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar pago/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anular/i })).not.toBeInTheDocument();
  });

  it('a JUGADOR with notes sees "Mis notas", read-only', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    coachingClient.getMyNotes.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          noteType: 'RECOMMENDATION',
          content: 'Sigue trabajando el saque.',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mis notas')).toBeInTheDocument();
    expect(screen.getByText('Sigue trabajando el saque.')).toBeInTheDocument();
  });

  it('does not show "Mis notas" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(coachingClient.getMyNotes).toHaveBeenCalled());
    expect(screen.queryByText('Mis notas')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mis notas" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(coachingClient.getMyNotes).not.toHaveBeenCalled();
  });

  it('a JUGADOR with no ratings sees the "Mi rendimiento" empty state', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Mi rendimiento')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes evaluaciones registradas.')).toBeInTheDocument();
  });

  it('a JUGADOR with ratings sees qualitative bands, not bare numbers', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [{ id: 'r1', area: 'SERVE', rating: 8, recordedAt: '2026-03-01T00:00:00.000Z' }],
      summary: { ratedAreas: ['SERVE'], latestByArea: { SERVE: 8 }, progressByArea: {} },
    });

    renderPage();

    const areaLabel = await screen.findByText('Saque');
    expect(areaLabel).toBeInTheDocument();
    const bandLabel = screen.getByText('Muy bueno');
    expect(bandLabel).toBeInTheDocument();
    // The band list item itself must show the qualitative label, not the raw
    // "8" -- the chart's own axis ticks legitimately render numbers and are
    // out of scope for this assertion.
    expect(bandLabel.closest('li')).toHaveTextContent('Saque');
    expect(bandLabel.closest('li')).not.toHaveTextContent('8');
  });

  it('a JUGADOR with a repeated evaluation for an area sees their progress-over-time chart', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [
        { id: 'r1', area: 'SERVE', rating: 5, recordedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'r2', area: 'SERVE', rating: 8, recordedAt: '2026-03-01T00:00:00.000Z' },
      ],
      summary: {
        ratedAreas: ['SERVE'],
        latestByArea: { SERVE: 8 },
        progressByArea: { SERVE: 3 },
      },
    });

    renderPage();

    expect(await screen.findByText('Tu progreso en el tiempo')).toBeInTheDocument();
  });

  it('a JUGADOR with only one evaluation ever does not see a progress-over-time chart', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [{ id: 'r1', area: 'SERVE', rating: 8, recordedAt: '2026-03-01T00:00:00.000Z' }],
      summary: { ratedAreas: ['SERVE'], latestByArea: { SERVE: 8 }, progressByArea: {} },
    });

    renderPage();

    await screen.findByText('Mi rendimiento');
    expect(screen.queryByText('Tu progreso en el tiempo')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mi rendimiento" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(coachingClient.getMyPerformance).not.toHaveBeenCalled();
  });

  it('a JUGADOR with a scheduled appointment sees "Mis citas"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    clinicalClient.getMyAppointments.mockResolvedValue({
      appointments: [
        {
          id: 'appt-1',
          status: 'SCHEDULED',
          periodStart: '2026-03-01T15:00:00.000Z',
          practitionerName: 'Dra. Sofia Reyes',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mis citas')).toBeInTheDocument();
    expect(screen.getByText(/Dra. Sofia Reyes/)).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
  });

  it('does not show "Mis citas" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(clinicalClient.getMyAppointments).toHaveBeenCalled());
    expect(screen.queryByText('Mis citas')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mis citas" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(clinicalClient.getMyAppointments).not.toHaveBeenCalled();
  });

  it('a JUGADOR with a visible clinical note sees "Notas de psicología y fisioterapia", read-only', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    clinicalClient.getMyNotes.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          noteType: 'RECOMMENDATION',
          content: 'Practica ejercicios de respiración antes de competir.',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Notas de psicología y fisioterapia')).toBeInTheDocument();
    expect(
      screen.getByText('Practica ejercicios de respiración antes de competir.'),
    ).toBeInTheDocument();
  });

  it('does not show "Notas de psicología y fisioterapia" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(clinicalClient.getMyNotes).toHaveBeenCalled());
    expect(screen.queryByText('Notas de psicología y fisioterapia')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Notas de psicología y fisioterapia" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(clinicalClient.getMyNotes).not.toHaveBeenCalled();
  });

  it('a JUGADOR with an active recovery plan sees "Mis planes de recuperación"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    clinicalClient.getMyRecoveryPlans.mockResolvedValue({
      plans: [{ id: 'plan-1', title: 'Rehabilitación de rodilla', status: 'ACTIVE', goal: null }],
    });

    renderPage();

    expect(await screen.findByText('Mis planes de recuperación')).toBeInTheDocument();
    expect(screen.getByText('Rehabilitación de rodilla')).toBeInTheDocument();
  });

  it('does not show "Mis planes de recuperación" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(clinicalClient.getMyRecoveryPlans).toHaveBeenCalled());
    expect(screen.queryByText('Mis planes de recuperación')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mis planes de recuperación" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(clinicalClient.getMyRecoveryPlans).not.toHaveBeenCalled();
  });

  it('a JUGADOR with a visible medical history entry sees "Mi historial médico"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    clinicalClient.getMyMedicalHistory.mockResolvedValue({
      entries: [
        { id: 'entry-1', condition: 'Esguince de tobillo', status: 'ACTIVE', description: null },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mi historial médico')).toBeInTheDocument();
    expect(screen.getByText('Esguince de tobillo')).toBeInTheDocument();
  });

  it('does not show "Mi historial médico" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(clinicalClient.getMyMedicalHistory).toHaveBeenCalled());
    expect(screen.queryByText('Mi historial médico')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mi historial médico" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(clinicalClient.getMyMedicalHistory).not.toHaveBeenCalled();
  });

  it('greets the user by first name once their profile loads', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument();
  });

  it('highlights the next CLASS-type reservation as "Tu próximo entrenamiento"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    // Each of the 8 day-queries gets its own (empty, except one) response --
    // a fixed mockResolvedValue would return the same rows for every call,
    // duplicating them in the flattened list.
    bookingClient.getSchedule
      .mockResolvedValueOnce({ reservations: [] })
      .mockResolvedValueOnce({
        reservations: [
          {
            id: 'r1',
            holderUserId: 'u1',
            reservationType: 'PRIVATE',
            status: 'CONFIRMED',
            periodStart: '2026-03-01T15:00:00.000Z',
            periodEnd: '2026-03-01T16:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        reservations: [
          {
            id: 'r2',
            holderUserId: 'u1',
            reservationType: 'CLASS',
            status: 'CONFIRMED',
            periodStart: '2026-03-02T15:00:00.000Z',
            periodEnd: '2026-03-02T16:00:00.000Z',
          },
        ],
      })
      .mockResolvedValue({ reservations: [] });

    renderPage();

    expect(await screen.findByText('Tu próximo entrenamiento')).toBeInTheDocument();
  });

  it('does not show "Tu próximo entrenamiento" when there is no CLASS reservation', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    bookingClient.getSchedule
      .mockResolvedValueOnce({
        reservations: [
          {
            id: 'r1',
            holderUserId: 'u1',
            reservationType: 'PRIVATE',
            status: 'CONFIRMED',
            periodStart: '2026-03-01T15:00:00.000Z',
            periodEnd: '2026-03-01T16:00:00.000Z',
          },
        ],
      })
      .mockResolvedValue({ reservations: [] });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Tu próximo entrenamiento')).not.toBeInTheDocument();
  });

  it('a JUGADOR with ranked matches sees "Ranking interno" with rank, record, and recent matches', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    competitionClient.getMyCompetitionSummary.mockResolvedValue({
      hasSeason: true,
      categories: [
        {
          category: 'CUARTA',
          modality: 'SINGLES',
          rank: 2,
          points: 6,
          wins: 3,
          losses: 1,
          matchesPlayed: 4,
          winPercentage: 75,
          qualifiesForMasters: true,
        },
      ],
      recentMatches: [
        {
          id: 'm1',
          playedAt: '2026-03-01T00:00:00.000Z',
          won: true,
          participantsA: [{ playerId: 'u1', firstName: 'Ana', lastName: 'Gomez' }],
          participantsB: [{ playerId: 'u2', firstName: 'Beto', lastName: 'Ruiz' }],
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Ranking interno')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Clasifica al Masters')).toBeInTheDocument();
    expect(screen.getByText(/3V - 1D/)).toBeInTheDocument();
    expect(screen.getByText(/vs\. Beto Ruiz/)).toBeInTheDocument();
    expect(screen.getByText('Victoria')).toBeInTheDocument();
  });

  it('does not show "Ranking interno" when the player has no ranked matches yet', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(competitionClient.getMyCompetitionSummary).toHaveBeenCalled());
    expect(screen.queryByText('Ranking interno')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Ranking interno" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(competitionClient.getMyCompetitionSummary).not.toHaveBeenCalled();
  });

  it('a JUGADOR with no active goals sees the "Mis metas" empty state', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Mis metas')).toBeInTheDocument();
    expect(
      screen.getByText('Aún no tienes metas activas. Crea una para seguir tu progreso.'),
    ).toBeInTheDocument();
  });

  it('a JUGADOR with an active goal sees its title and a progress bar', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    goalsClient.getMyGoals.mockResolvedValue({
      goals: [
        {
          id: 'goal-1',
          title: 'Saque a 8',
          metricType: 'SKILL_RATING',
          status: 'ACTIVE',
          currentProgress: 6,
          percentComplete: 75,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Saque a 8')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas / Agregar meta' })).toHaveAttribute(
      'href',
      '/mi-ctcj/perfil',
    );
  });

  it('a JUGADOR sees a link to their full profile page', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByRole('link', { name: 'Ver mi perfil completo' })).toHaveAttribute(
      'href',
      '/mi-ctcj/perfil',
    );
  });

  it('a plain USUARIO never sees "Mis metas" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(goalsClient.getMyGoals).not.toHaveBeenCalled();
  });

  it('a JUGADOR can search for a player and send a challenge', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    membershipClient.searchPlayers.mockResolvedValue({
      players: [{ id: 'p2', firstName: 'Luis', lastName: 'Perez' }],
    });
    challengesClient.createChallenge.mockResolvedValue({ id: 'c1', status: 'PENDING' });
    const user = userEvent.setup();

    renderPage();
    await user.type(await screen.findByLabelText('Buscar jugador'), 'lu');

    expect(await screen.findByText('Luis Perez')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retar' }));
    await user.click(screen.getByRole('button', { name: 'Enviar reto' }));

    await waitFor(() =>
      expect(challengesClient.createChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ opponentUserId: 'p2' }),
      ),
    );
  });

  it('a JUGADOR sees a received challenge and can accept it', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'OPPONENT',
          status: 'PENDING',
          message: 'Sábado?',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
        },
      ],
    });
    challengesClient.acceptChallenge.mockResolvedValue({ id: 'c1', status: 'ACCEPTED' });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('Retos recibidos')).toBeInTheDocument();
    expect(screen.getByText(/Ana Gomez/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => expect(challengesClient.acceptChallenge).toHaveBeenCalledWith('c1'));
  });

  it('a JUGADOR sees a sent challenge and can cancel it', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'CHALLENGER',
          status: 'PENDING',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
        },
      ],
    });
    challengesClient.cancelChallenge.mockResolvedValue({ id: 'c1', status: 'CANCELLED' });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('Retos enviados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(challengesClient.cancelChallenge).toHaveBeenCalledWith('c1'));
  });

  it('a JUGADOR sees an ACCEPTED challenge under "Partidos por confirmar" even as the opponent (regression: previously invisible)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'OPPONENT',
          status: 'ACCEPTED',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
          matchResult: null,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Partidos por confirmar')).toBeInTheDocument();
    expect(screen.getByText('vs. Ana Gomez')).toBeInTheDocument();
    // Neither the (PENDING-only) received list nor the (CHALLENGER-only) sent list.
    expect(screen.queryByText('Retos recibidos')).not.toBeInTheDocument();
    expect(screen.queryByText('Retos enviados')).not.toBeInTheDocument();
  });

  it('submitting a match score sends the caller-relative payload to the API', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'CHALLENGER',
          status: 'ACCEPTED',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
          matchResult: null,
        },
      ],
    });
    challengesClient.submitMatchScore.mockResolvedValue({ status: 'PENDING' });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Partidos por confirmar');
    await user.type(screen.getByLabelText('Sets que ganaste'), '2');
    await user.type(screen.getByLabelText('Sets que ganó tu rival'), '0');
    await user.click(screen.getByRole('button', { name: 'Enviar resultado' }));

    await waitFor(() =>
      expect(challengesClient.submitMatchScore).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ mySetsWon: 2, opponentSetsWon: 0 }),
      ),
    );
  });

  it('shows a waiting message once the caller has submitted but the opponent has not', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'CHALLENGER',
          status: 'ACCEPTED',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
          matchResult: {
            status: 'PENDING',
            mySubmission: {
              category: 'CUARTA',
              mySetsWon: 2,
              opponentSetsWon: 0,
              playedAt: '2026-08-14',
            },
            opponentSubmission: null,
            mismatch: false,
          },
        },
      ],
    });

    renderPage();

    expect(
      await screen.findByText('Esperando que Ana Gomez registre el resultado.'),
    ).toBeInTheDocument();
  });

  it('shows a mismatch banner with both submissions when they disagree', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'CHALLENGER',
          status: 'ACCEPTED',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
          matchResult: {
            status: 'PENDING',
            mySubmission: {
              category: 'CUARTA',
              mySetsWon: 2,
              opponentSetsWon: 0,
              playedAt: '2026-08-14',
            },
            opponentSubmission: {
              category: 'CUARTA',
              mySetsWon: 2,
              opponentSetsWon: 0,
              playedAt: '2026-08-14',
            },
            mismatch: true,
          },
        },
      ],
    });

    renderPage();

    expect(await screen.findByText(/Los resultados no coinciden/)).toBeInTheDocument();
    expect(screen.getByText(/Tu resultado: 2-0/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado de Ana Gomez: 2-0/)).toBeInTheDocument();
  });

  it('a CONFIRMED (COMPLETED) challenge no longer appears in "Partidos por confirmar"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'c1',
          role: 'CHALLENGER',
          status: 'COMPLETED',
          otherParty: { id: 'p2', firstName: 'Ana', lastName: 'Gomez' },
          matchResult: null,
        },
      ],
    });

    renderPage();

    await screen.findByText('Retos');
    expect(screen.queryByText('Partidos por confirmar')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Retos" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(challengesClient.getMyChallenges).not.toHaveBeenCalled();
  });

  it('a JUGADOR sees the club activity feed merging match results and completed tournaments', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    competitionClient.getRecentClubMatches.mockResolvedValue({
      matches: [
        {
          id: 'm1',
          category: 'CUARTA',
          modality: 'SINGLES',
          winnerSide: 'A',
          participantsA: [{ playerId: 'p1', firstName: 'Ana', lastName: 'Gomez' }],
          participantsB: [{ playerId: 'p2', firstName: 'Luis', lastName: 'Perez' }],
          playedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
    });
    tournamentClient.listTournaments.mockResolvedValue({
      tournaments: [
        {
          id: 't1',
          name: 'Copa Verano',
          status: 'COMPLETED',
          completedAt: '2026-03-05T10:00:00.000Z',
        },
        { id: 't2', name: 'Copa Invierno', status: 'DRAFT', completedAt: null },
      ],
    });

    renderPage();

    expect(await screen.findByText('Actividad del club')).toBeInTheDocument();
    expect(screen.getByText(/Resultado: Ana Gomez venció a Luis Perez/)).toBeInTheDocument();
    expect(screen.getByText('Torneo finalizado: Copa Verano')).toBeInTheDocument();
    expect(screen.queryByText(/Copa Invierno/)).not.toBeInTheDocument();
  });

  it('shows the empty state when there is no club activity', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Sin actividad reciente.')).toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Actividad del club" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(competitionClient.getRecentClubMatches).not.toHaveBeenCalled();
    expect(tournamentClient.listTournaments).not.toHaveBeenCalled();
  });
});
