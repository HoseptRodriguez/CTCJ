import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { challengesClient } from '../../api/challengesClient.js';
import { clinicalClient } from '../../api/clinicalClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { competitionClient } from '../../api/competitionClient.js';
import { goalsClient } from '../../api/goalsClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';

import { renderMyCtcj, setEmptyAccount } from './testUtils.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/affiliationClient.js', () => ({
  affiliationClient: { getMyRequests: vi.fn(), submitRequest: vi.fn() },
}));
vi.mock('../../api/billingClient.js', () => ({
  billingClient: { getMyMemberships: vi.fn(), getMyInvoices: vi.fn() },
}));
vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { getMyReservations: vi.fn(), getSchedule: vi.fn(), cancel: vi.fn() },
}));
vi.mock('../../api/challengesClient.js', () => ({
  challengesClient: {
    createChallenge: vi.fn(),
    getMyChallenges: vi.fn(),
    acceptChallenge: vi.fn(),
    rejectChallenge: vi.fn(),
    cancelChallenge: vi.fn(),
    submitMatchScore: vi.fn(),
  },
}));
vi.mock('../../api/clinicalClient.js', () => ({
  clinicalClient: {
    getMyAppointments: vi.fn(),
    getMyNotes: vi.fn(),
    getMyRecoveryPlans: vi.fn(),
    getMyMedicalHistory: vi.fn(),
  },
}));
vi.mock('../../api/coachingClient.js', () => ({
  coachingClient: { getMyNotes: vi.fn(), getMyPerformance: vi.fn() },
}));
vi.mock('../../api/communityClient.js', () => ({ communityClient: { listPosts: vi.fn() } }));
vi.mock('../../api/competitionClient.js', () => ({
  competitionClient: {
    getMyCompetitionSummary: vi.fn(),
    getRecentClubMatches: vi.fn(),
    getStandings: vi.fn(),
  },
}));
vi.mock('../../api/goalsClient.js', () => ({
  goalsClient: { getMyGoals: vi.fn(), createGoal: vi.fn(), abandonGoal: vi.fn() },
}));
vi.mock('../../api/guardianshipClient.js', () => ({
  guardianshipClient: { listMine: vi.fn(), requestGuardianship: vi.fn() },
}));
vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: {
    getMyStatus: vi.fn(),
    getMyProfile: vi.fn(),
    searchPlayers: vi.fn(),
    updateMyProfile: vi.fn(),
    uploadMyAvatar: vi.fn(),
    getMyAchievements: vi.fn(),
  },
}));
vi.mock('../../api/notificationsClient.js', () => ({
  notificationsClient: {
    getMyNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));
vi.mock('../../api/tournamentClient.js', () => ({
  tournamentClient: { listTournaments: vi.fn() },
}));

const USUARIO = ['USUARIO'];
const HOUR = 60 * 60 * 1000;

function reservation(overrides) {
  const start = new Date(Date.now() + 26 * HOUR);
  return {
    id: 'r1',
    courtId: 'c1',
    courtName: 'Cancha 2',
    periodStart: start.toISOString(),
    periodEnd: new Date(start.getTime() + HOUR).toISOString(),
    status: 'CONFIRMED',
    reservationType: 'PRIVATE',
    holderUserId: 'u1',
    priceCop: 35000,
    paymentId: null,
    isOwnBooking: true,
    bookedForOther: false,
    ...overrides,
  };
}

describe('Mi CTCJ — Inicio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEmptyAccount();
  });

  it('greets the person by first name and shows the tabs with icon and text', async () => {
    renderMyCtcj();
    expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Mi CTCJ' });
    for (const tab of ['Inicio', 'Reservas', 'Mi progreso', 'Ranking', 'Comunidad']) {
      expect(within(nav).getByRole('link', { name: tab })).toBeInTheDocument();
    }
  });

  it('asks for the reservations once, with the new endpoint, never /schedule day by day', async () => {
    renderMyCtcj();
    await waitFor(() => expect(bookingClient.getMyReservations).toHaveBeenCalledTimes(1));
    expect(bookingClient.getSchedule).not.toHaveBeenCalled();
  });

  it('a JUGADOR sees their membership status as a badge with text', async () => {
    membershipClient.getMyStatus.mockResolvedValue({ status: 'OVERDUE' });
    renderMyCtcj();
    expect(await screen.findByText('Vencida')).toBeInTheDocument();
  });

  it('shows "Sin membresía" for a JUGADOR not yet enrolled (null status)', async () => {
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    renderMyCtcj();
    expect(await screen.findByText('Sin membresía')).toBeInTheDocument();
  });

  it('a plain USUARIO: no membership status, only Inicio and Reservas tabs, and player data is never fetched', async () => {
    renderMyCtcj('/mi-ctcj', { roles: USUARIO });
    await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' });
    const nav = screen.getByRole('navigation', { name: 'Mi CTCJ' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Inicio', 'Reservas']);
    expect(membershipClient.getMyStatus).not.toHaveBeenCalled();
    for (const fn of [
      coachingClient.getMyNotes,
      coachingClient.getMyPerformance,
      clinicalClient.getMyAppointments,
      competitionClient.getMyCompetitionSummary,
      goalsClient.getMyGoals,
      challengesClient.getMyChallenges,
      billingClient.getMyMemberships,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('a plain USUARIO sees the 3 steps and can ask to become a player', async () => {
    affiliationClient.submitRequest.mockResolvedValue({ id: 'a1' });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj', { roles: USUARIO });

    const steps = await screen.findByRole('list', { name: 'Pasos para ser jugador' });
    expect(
      within(steps)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining('Crea tu cuenta'),
      expect.stringContaining('Pide ser jugador'),
      expect.stringContaining('El club te aprueba'),
    ]);
    await user.type(
      screen.getByLabelText('Cuéntanos por qué quieres unirte (opcional)'),
      'Juego hace años',
    );
    await user.click(screen.getByRole('button', { name: 'Pedir ser jugador' }));

    expect(affiliationClient.submitRequest).toHaveBeenCalledWith({ notes: 'Juego hace años' });
    await waitFor(() => expect(affiliationClient.getMyRequests).toHaveBeenCalledTimes(2));
  });

  it('a JUGADOR does not see the affiliation block', async () => {
    renderMyCtcj();
    await screen.findByRole('heading', { level: 1, name: 'Hola, Ana' });
    expect(screen.queryByText('Hazte jugador del club')).not.toBeInTheDocument();
    expect(affiliationClient.getMyRequests).not.toHaveBeenCalled();
  });

  it('"Tu próximo partido": day, time, court and payment state', async () => {
    bookingClient.getMyReservations.mockResolvedValue({ reservations: [reservation()] });
    renderMyCtcj();
    expect(await screen.findByText('Cancha 2')).toBeInTheDocument();
    expect(screen.getByText(/Pagas en recepción · \$\s35\.000/)).toBeInTheDocument();
    expect(screen.queryByText('Tu próximo entrenamiento')).not.toBeInTheDocument();
  });

  it('highlights a CLASS reservation as "Tu próximo entrenamiento"', async () => {
    bookingClient.getMyReservations.mockResolvedValue({
      reservations: [reservation({ reservationType: 'CLASS' })],
    });
    renderMyCtcj();
    expect(await screen.findByText('Tu próximo entrenamiento')).toBeInTheDocument();
  });

  it('cancelling the next reservation asks first, then frees it', async () => {
    bookingClient.getMyReservations.mockResolvedValue({ reservations: [reservation()] });
    const user = userEvent.setup();
    renderMyCtcj();
    await screen.findByText('Cancha 2');

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Cancelar esta reserva?' });
    expect(dialog).toHaveTextContent('Faltan más de 12 horas: puedes cancelar sin penalidad.');
    expect(bookingClient.cancel).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar reserva' }));
    expect(bookingClient.cancel).toHaveBeenCalledWith('r1');
  });

  it('shows the empty state with "Reservar cancha" when there are no reservations', async () => {
    renderMyCtcj();
    expect(await screen.findByText('No tienes reservas próximas')).toBeInTheDocument();
  });

  it('"Mi ranking": big position and the road to the Masters Top 8', async () => {
    competitionClient.getMyCompetitionSummary.mockResolvedValue({
      hasSeason: true,
      categories: [
        {
          category: 'TERCERA',
          modality: 'SINGLES',
          rank: 11,
          points: 14,
          wins: 5,
          losses: 2,
          winPercentage: 71,
          qualifiesForMasters: false,
        },
      ],
      recentMatches: [],
    });
    renderMyCtcj();
    expect(
      await screen.findByText('Te faltan 3 puestos para el Top 8 del Masters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('#11')).toBeInTheDocument();
  });

  it('a received challenge can be accepted from Inicio', async () => {
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'ch1',
          role: 'OPPONENT',
          status: 'PENDING',
          otherParty: { firstName: 'Luis', lastName: 'Pérez' },
          message: '¿Jugamos?',
        },
      ],
    });
    challengesClient.acceptChallenge.mockResolvedValue({});
    const user = userEvent.setup();
    renderMyCtcj();

    expect(await screen.findByText('Luis Pérez te retó')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(challengesClient.acceptChallenge).toHaveBeenCalledWith('ch1');
  });

  it('"Mis metas" shows progress as words ("7 de 10"), not only a bar', async () => {
    goalsClient.getMyGoals.mockResolvedValue({
      goals: [
        {
          id: 'g1',
          title: 'Ganar 10 partidos',
          status: 'ACTIVE',
          metricType: 'MATCH_WINS',
          currentProgress: 7,
          targetValue: 10,
          percentComplete: 70,
        },
      ],
    });
    renderMyCtcj();
    expect(await screen.findByText('Ganar 10 partidos')).toBeInTheDocument();
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '' })).toHaveAttribute(
      'aria-valuetext',
      '7 de 10',
    );
  });

  it('"Tu entrenador dice" shows the latest note', async () => {
    coachingClient.getMyNotes.mockResolvedValue({
      notes: [
        {
          id: 'n1',
          noteType: 'TRAINING',
          content: 'Nota vieja',
          createdAt: '2026-08-01T10:00:00Z',
        },
        {
          id: 'n2',
          noteType: 'RECOMMENDATION',
          content: 'Flexiona más las rodillas',
          createdAt: '2026-09-20T10:00:00Z',
        },
      ],
    });
    renderMyCtcj();
    expect(await screen.findByText('“Flexiona más las rodillas”')).toBeInTheDocument();
    expect(screen.queryByText('“Nota vieja”')).not.toBeInTheDocument();
  });

  it('"Mi rendimiento" describes skills in words, never bare numbers, and names what improved', async () => {
    const old = new Date(Date.now() - 120 * 24 * HOUR).toISOString();
    const recent = new Date(Date.now() - 2 * 24 * HOUR).toISOString();
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [
        { area: 'SERVE', rating: 5, recordedAt: old },
        { area: 'SERVE', rating: 9, recordedAt: recent },
        { area: 'FOOTWORK', rating: 3, recordedAt: recent },
      ],
      summary: {
        ratedAreas: ['SERVE', 'FOOTWORK'],
        latestByArea: { SERVE: 9, FOOTWORK: 3 },
        progressByArea: { SERVE: 4 },
      },
    });
    renderMyCtcj();
    const levels = await screen.findByRole('list', { name: 'Nivel por habilidad' });
    expect(levels).toHaveTextContent('SaqueExcelente· mejoró');
    expect(levels).toHaveTextContent('PiesEn desarrollo');
    expect(levels).not.toHaveTextContent('9');
    expect(screen.getByText('Lo que más mejoró').nextElementSibling).toHaveTextContent('Saque');
    expect(screen.getByText('Para trabajar').nextElementSibling).toHaveTextContent('Pies');
  });

  it('"Mi rendimiento" empty state when there are no evaluations', async () => {
    renderMyCtcj();
    expect(await screen.findByText('Aún no tienes evaluaciones registradas')).toBeInTheDocument();
  });

  it('"Membresía y pagos": plan and invoices with text badges, and online payment marked as coming soon', async () => {
    billingClient.getMyMemberships.mockResolvedValue({
      memberships: [
        { id: 'm1', planName: 'Plan Academia', status: 'ACTIVE', currentPriceCop: 250000 },
      ],
    });
    billingClient.getMyInvoices.mockResolvedValue({
      invoices: [
        { id: 'i1', membershipId: 'm1', amountCop: 250000, dueDate: '2026-01-05', status: 'PAID' },
        {
          id: 'i2',
          membershipId: 'm1',
          amountCop: 250000,
          dueDate: '2026-01-10',
          status: 'PENDING',
        },
      ],
    });
    renderMyCtcj();
    expect(await screen.findByText('Plan Academia')).toBeInTheDocument();
    expect(screen.getByText('Pagada')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText('Pago en línea — Próximamente.')).toBeInTheDocument();
  });

  it('a guardian gets the big "Reservar para: Yo / {menor}" shortcut', async () => {
    guardianshipClient.listMine.mockResolvedValue({
      guardianships: [
        {
          id: 'g1',
          minorUserId: 'kid1',
          minorEmail: 'hijo@correo.com',
          status: 'APPROVED',
          canBook: true,
        },
      ],
    });
    renderMyCtcj();
    const section = await screen.findByRole('region', { name: 'Reservar para:' });
    expect(within(section).getByRole('link', { name: 'Yo' })).toHaveAttribute('href', '/canchas');
    expect(within(section).getByRole('link', { name: 'hijo@correo.com' })).toHaveAttribute(
      'href',
      '/canchas?para=kid1',
    );
  });

  it('each section fails on its own: one error does not blank the others', async () => {
    goalsClient.getMyGoals.mockRejectedValue(new Error('boom'));
    coachingClient.getMyNotes.mockResolvedValue({
      notes: [
        { id: 'n1', noteType: 'TRAINING', content: 'Sigue así', createdAt: '2026-09-20T10:00:00Z' },
      ],
    });
    renderMyCtcj();
    expect(await screen.findByText('No pudimos cargar mis metas')).toBeInTheDocument();
    expect(await screen.findByText('“Sigue así”')).toBeInTheDocument();
  });
});
