import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';
import { challengesClient } from '../../api/challengesClient.js';
import { clinicalClient } from '../../api/clinicalClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { competitionClient } from '../../api/competitionClient.js';
import { goalsClient } from '../../api/goalsClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';

import { PROFILE, renderMyCtcj, setEmptyAccount } from './testUtils.jsx';

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
    getMyPhysioConsent: vi.fn(),
    grantMyPhysioConsent: vi.fn(),
    revokeMyPhysioConsent: vi.fn(),
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

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  setEmptyAccount();
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
});

describe('Mi CTCJ — Reservas', () => {
  it('lists upcoming reservations, including one booked for a minor, and cancels after confirming', async () => {
    const start = new Date(Date.now() + 5 * HOUR);
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
    bookingClient.getMyReservations.mockResolvedValue({
      reservations: [
        {
          id: 'r7',
          courtName: 'Cancha 1',
          periodStart: start.toISOString(),
          periodEnd: new Date(start.getTime() + HOUR).toISOString(),
          status: 'CONFIRMED',
          reservationType: 'PRIVATE',
          holderUserId: 'kid1',
          priceCop: 35000,
          paymentId: 'p1',
          bookedForOther: true,
        },
      ],
    });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/reservas');

    const list = await screen.findByRole('list', { name: 'Próximas reservas' });
    expect(await within(list).findByText('Reservada para hijo@correo.com')).toBeInTheDocument();
    expect(within(list).getByText('Pagada')).toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: 'Cancelar reserva' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Faltan menos de 12 horas');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar reserva' }));
    expect(bookingClient.cancel).toHaveBeenCalledWith('r7');
  });
});

describe('Mi CTCJ — Mi progreso', () => {
  it('creates a goal with the same payload as before', async () => {
    goalsClient.createGoal.mockResolvedValue({ id: 'g9' });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/progreso');

    await user.type(await screen.findByLabelText('Nombre de la meta'), 'Mejorar mi saque');
    await user.selectOptions(screen.getByLabelText('Tipo de meta'), 'SKILL_RATING');
    await user.selectOptions(screen.getByLabelText('Habilidad'), 'SERVE');
    await user.type(screen.getByLabelText('Calificación objetivo (1 a 10)'), '8');
    await user.click(screen.getByRole('button', { name: 'Agregar meta' }));

    expect(goalsClient.createGoal).toHaveBeenCalledWith({
      title: 'Mejorar mi saque',
      metricType: 'SKILL_RATING',
      targetArea: 'SERVE',
      targetValue: 8,
      targetCategory: undefined,
      targetModality: undefined,
    });
    await waitFor(() => expect(goalsClient.getMyGoals).toHaveBeenCalledTimes(2));
  });

  it('a goal without a name is explained, not sent', async () => {
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/progreso');
    await user.click(await screen.findByRole('button', { name: 'Agregar meta' }));
    expect(
      screen.getByText('Escribe un nombre para la meta, por ejemplo “Mejorar mi saque”.'),
    ).toBeInTheDocument();
    expect(goalsClient.createGoal).not.toHaveBeenCalled();
  });

  it('abandoning a goal asks first', async () => {
    goalsClient.getMyGoals.mockResolvedValue({
      goals: [
        {
          id: 'g1',
          title: 'Ganar 5 partidos',
          status: 'ACTIVE',
          metricType: 'MATCH_WINS',
          currentProgress: 2,
          targetValue: 5,
          percentComplete: 40,
        },
      ],
    });
    goalsClient.abandonGoal.mockResolvedValue({});
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/progreso');

    await user.click(await screen.findByRole('button', { name: 'Abandonar meta' }));
    expect(goalsClient.abandonGoal).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Sí, abandonar meta' }));
    expect(goalsClient.abandonGoal).toHaveBeenCalledWith('g1');
  });

  it('the progress-over-time chart waits for a second evaluation, with one shared request', async () => {
    renderMyCtcj('/mi-ctcj/progreso');
    expect(await screen.findByText('Todavía no hay una segunda evaluación')).toBeInTheDocument();
    expect(coachingClient.getMyPerformance).toHaveBeenCalledTimes(1);
  });

  it('shows appointments, clinical notes, recovery plans and medical history, with the privacy notice', async () => {
    clinicalClient.getMyAppointments.mockResolvedValue({
      appointments: [
        {
          id: 'a1',
          practitionerName: 'Dra. Ruiz',
          periodStart: '2026-10-01T15:00:00Z',
          status: 'SCHEDULED',
        },
      ],
    });
    clinicalClient.getMyNotes.mockResolvedValue({
      notes: [
        {
          id: 'cn1',
          noteType: 'RECOMMENDATION',
          content: 'Respira antes de sacar',
          createdAt: '2026-09-01T10:00:00Z',
        },
      ],
    });
    clinicalClient.getMyRecoveryPlans.mockResolvedValue({
      plans: [{ id: 'p1', title: 'Hombro derecho', status: 'ACTIVE', goal: 'Sin dolor al sacar' }],
    });
    clinicalClient.getMyMedicalHistory.mockResolvedValue({
      entries: [{ id: 'm1', condition: 'Tendinitis', status: 'RESOLVED', description: null }],
    });
    renderMyCtcj('/mi-ctcj/progreso');

    expect(await screen.findByText('Dra. Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
    expect(await screen.findByText('Respira antes de sacar')).toBeInTheDocument();
    expect(await screen.findByText('Hombro derecho')).toBeInTheDocument();
    expect(await screen.findByText('Tendinitis')).toBeInTheDocument();
    expect(
      screen.getByText('Solo tú y tu equipo de salud ven esta información.'),
    ).toBeInTheDocument();
  });

  it('achievements show earned and pending, in words', async () => {
    membershipClient.getMyAchievements.mockResolvedValue({
      badges: [
        { code: 'FIRST_WIN', label: 'Primera victoria', earned: true },
        { code: 'TEN_WINS', label: '10 victorias', earned: false },
      ],
    });
    renderMyCtcj('/mi-ctcj/progreso');
    expect(await screen.findByText('Primera victoria')).toBeInTheDocument();
    expect(screen.getByText('Obtenido')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });
});

describe('Mi CTCJ — Ranking', () => {
  it('shows each category with position and Masters qualification, plus recent matches', async () => {
    competitionClient.getMyCompetitionSummary.mockResolvedValue({
      hasSeason: true,
      categories: [
        {
          category: 'TERCERA',
          modality: 'SINGLES',
          rank: 2,
          points: 20,
          wins: 7,
          losses: 1,
          winPercentage: 88,
          qualifiesForMasters: true,
        },
      ],
      recentMatches: [
        {
          id: 'mt1',
          won: true,
          playedAt: '2026-09-10T15:00:00Z',
          participantsA: [],
          participantsB: [{ firstName: 'Luis', lastName: 'Pérez' }],
        },
      ],
    });
    renderMyCtcj('/mi-ctcj/ranking');
    expect(await screen.findByText('Clasifica al Masters')).toBeInTheDocument();
    expect(screen.getByText('7 ganados · 1 perdidos · 20 puntos')).toBeInTheDocument();
    expect(screen.getByText(/vs\. Luis Pérez/)).toBeInTheDocument();
    expect(screen.getByText('Victoria')).toBeInTheDocument();
  });

  it('the season table opens on my category and marks my row', async () => {
    competitionClient.getMyCompetitionSummary.mockResolvedValue({
      hasSeason: true,
      categories: [
        {
          category: 'CUARTA',
          modality: 'DOBLES',
          rank: 1,
          points: 9,
          wins: 3,
          losses: 0,
          qualifiesForMasters: true,
        },
      ],
      recentMatches: [],
    });
    competitionClient.getStandings.mockResolvedValue({
      standings: [
        {
          playerId: 'u1',
          playerName: 'Ana Gomez',
          rank: 1,
          points: 9,
          matchesPlayed: 3,
          qualifiesForMasters: true,
        },
      ],
    });
    renderMyCtcj('/mi-ctcj/ranking');
    await waitFor(() =>
      expect(competitionClient.getStandings).toHaveBeenCalledWith({
        category: 'CUARTA',
        modality: 'DOBLES',
      }),
    );
    expect(await screen.findByText(/Ana Gomez \(tú\)/)).toBeInTheDocument();
  });

  it('searches a player and sends a challenge', async () => {
    membershipClient.searchPlayers.mockResolvedValue({
      players: [{ id: 'p2', firstName: 'Luis', lastName: 'Pérez' }],
    });
    challengesClient.createChallenge.mockResolvedValue({ id: 'c1' });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/ranking');

    await user.type(await screen.findByLabelText('Buscar jugador'), 'Lu');
    const results = await screen.findByRole('list', { name: 'Jugadores encontrados' });
    await user.click(within(results).getByRole('button', { name: 'Retar' }));
    await user.type(screen.getByLabelText('Mensaje (opcional)'), '¿Sábado?');
    await user.click(screen.getByRole('button', { name: 'Enviar reto' }));

    expect(challengesClient.createChallenge).toHaveBeenCalledWith({
      opponentUserId: 'p2',
      message: '¿Sábado?',
    });
  });

  it('an ACCEPTED challenge appears under "Partidos por confirmar" even for the opponent, and sends the score', async () => {
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'ch1',
          role: 'OPPONENT',
          status: 'ACCEPTED',
          otherParty: { firstName: 'Luis', lastName: 'Pérez' },
          matchResult: null,
        },
      ],
    });
    challengesClient.submitMatchScore.mockResolvedValue({});
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/ranking');

    expect(await screen.findByText('Partidos por confirmar')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Sets que ganaste'), '2');
    await user.type(screen.getByLabelText('Sets que ganó tu rival'), '1');
    await user.clear(screen.getByLabelText('Fecha del partido'));
    await user.type(screen.getByLabelText('Fecha del partido'), '2026-09-20');
    await user.click(screen.getByRole('button', { name: 'Enviar resultado' }));

    expect(challengesClient.submitMatchScore).toHaveBeenCalledWith('ch1', {
      category: 'SEGUNDA',
      mySetsWon: 2,
      opponentSetsWon: 1,
      playedAt: '2026-09-20',
    });
  });

  it('says it is waiting for the rival once my score is in', async () => {
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'ch1',
          role: 'CHALLENGER',
          status: 'ACCEPTED',
          otherParty: { firstName: 'Luis', lastName: 'Pérez' },
          matchResult: {
            mySubmission: {
              category: 'TERCERA',
              mySetsWon: 2,
              opponentSetsWon: 0,
              playedAt: '2026-09-20',
            },
            opponentSubmission: null,
            mismatch: false,
          },
        },
      ],
    });
    renderMyCtcj('/mi-ctcj/ranking');
    expect(
      await screen.findByText('Esperando que Luis Pérez registre el resultado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar resultado' })).toBeInTheDocument();
  });

  it('shows both scores when they do not match', async () => {
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'ch1',
          role: 'CHALLENGER',
          status: 'ACCEPTED',
          otherParty: { firstName: 'Luis', lastName: 'Pérez' },
          matchResult: {
            mySubmission: {
              category: 'TERCERA',
              mySetsWon: 2,
              opponentSetsWon: 0,
              playedAt: '2026-09-20',
            },
            opponentSubmission: {
              category: 'TERCERA',
              mySetsWon: 2,
              opponentSetsWon: 1,
              playedAt: '2026-09-20',
            },
            mismatch: true,
          },
        },
      ],
    });
    renderMyCtcj('/mi-ctcj/ranking');
    const alert = await screen.findByText(/Los resultados no coinciden/);
    expect(alert).toHaveTextContent('Tu resultado: 2-0');
    expect(alert).toHaveTextContent('Resultado de Luis Pérez: 2-1');
  });

  it('a completed challenge no longer waits for a score', async () => {
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'ch1',
          role: 'CHALLENGER',
          status: 'COMPLETED',
          otherParty: { firstName: 'Luis', lastName: 'Pérez' },
        },
      ],
    });
    renderMyCtcj('/mi-ctcj/ranking');
    expect(await screen.findByText('Completado')).toBeInTheDocument();
    expect(screen.queryByText('Partidos por confirmar')).not.toBeInTheDocument();
  });

  it('cancelling a sent challenge asks first', async () => {
    challengesClient.getMyChallenges.mockResolvedValue({
      challenges: [
        {
          id: 'ch3',
          role: 'CHALLENGER',
          status: 'PENDING',
          otherParty: { firstName: 'Luis', lastName: 'Pérez' },
        },
      ],
    });
    challengesClient.cancelChallenge.mockResolvedValue({});
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/ranking');

    await user.click(await screen.findByRole('button', { name: 'Cancelar reto' }));
    expect(challengesClient.cancelChallenge).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Sí, cancelar reto' }));
    expect(challengesClient.cancelChallenge).toHaveBeenCalledWith('ch3');
  });

  it('the club activity feed merges match results and finished tournaments, newest first', async () => {
    competitionClient.getRecentClubMatches.mockResolvedValue({
      matches: [
        {
          id: 'm1',
          playedAt: '2026-09-10T15:00:00Z',
          winnerSide: 'A',
          category: 'TERCERA',
          modality: 'SINGLES',
          participantsA: [{ firstName: 'Ana', lastName: 'Gomez' }],
          participantsB: [{ firstName: 'Luis', lastName: 'Pérez' }],
        },
      ],
    });
    tournamentClient.listTournaments.mockResolvedValue({
      tournaments: [
        { id: 't1', name: 'Copa Jardín', status: 'COMPLETED', completedAt: '2026-09-15T20:00:00Z' },
      ],
    });
    renderMyCtcj('/mi-ctcj/ranking');
    const first = await screen.findByText('Torneo finalizado: Copa Jardín');
    const second = screen.getByText(/Ana Gomez venció a Luis Pérez/);
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Mi CTCJ — pestañas de jugador', () => {
  it('a plain USUARIO who opens Ranking is told how to become a player', async () => {
    renderMyCtcj('/mi-ctcj/ranking', { roles: ['USUARIO'] });
    expect(await screen.findByText('Esta sección es para jugadores del club')).toBeInTheDocument();
    expect(competitionClient.getMyCompetitionSummary).not.toHaveBeenCalled();
  });
});

describe('Mi CTCJ — Mi perfil', () => {
  it('shows the initial when there is no photo, prefills and saves the personal data', async () => {
    membershipClient.getMyProfile.mockResolvedValue({ ...PROFILE, phone: '3001234567' });
    membershipClient.updateMyProfile.mockResolvedValue({
      phone: '3009998888',
      birthDate: '1980-05-02',
      bio: null,
    });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/perfil');

    expect(await screen.findByRole('img', { name: 'Aún sin foto' })).toHaveTextContent('A');
    const phone = screen.getByLabelText('Teléfono');
    expect(phone).toHaveValue('3001234567');
    await user.clear(phone);
    await user.type(phone, '3009998888');
    await user.type(screen.getByLabelText('Fecha de nacimiento'), '1980-05-02');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(membershipClient.updateMyProfile).toHaveBeenCalledWith({
      phone: '3009998888',
      birthDate: '1980-05-02',
      bio: null,
    });
  });

  it('uploads a new photo and shows it', async () => {
    membershipClient.uploadMyAvatar.mockResolvedValue({ avatarUrl: '/uploads/avatars/nuevo.jpg' });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/perfil');
    await screen.findByRole('img', { name: 'Aún sin foto' });

    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Elegir foto de perfil'), file);

    expect(membershipClient.uploadMyAvatar).toHaveBeenCalledWith(file);
    expect(await screen.findByRole('img', { name: 'Tu foto de perfil' })).toBeInTheDocument();
  });

  it('rejects a photo that is too heavy, and says what to do', async () => {
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/perfil');
    await screen.findByRole('img', { name: 'Aún sin foto' });
    const big = new File([new Uint8Array(3 * 1024 * 1024)], 'grande.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Elegir foto de perfil'), big);
    expect(
      screen.getByText('La foto pesa más de 2 MB. Elige una más liviana.'),
    ).toBeInTheDocument();
    expect(membershipClient.uploadMyAvatar).not.toHaveBeenCalled();
  });

  it('the player authorizes, and later withdraws, admin access to their physio notes', async () => {
    clinicalClient.grantMyPhysioConsent.mockResolvedValue({
      authorized: true,
      grantedAt: '2026-09-26T15:00:00.000Z',
      revokedAt: null,
    });
    clinicalClient.revokeMyPhysioConsent.mockResolvedValue({
      authorized: false,
      grantedAt: '2026-09-26T15:00:00.000Z',
      revokedAt: '2026-09-27T15:00:00.000Z',
    });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/perfil');

    expect(
      await screen.findByText(
        'Autorizo a la administración del club a ver mis notas de fisioterapia',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('No autorizado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Autorizar' }));
    expect(clinicalClient.grantMyPhysioConsent).not.toHaveBeenCalled();
    const grant = await screen.findByRole('alertdialog', {
      name: '¿Autorizar a la administración?',
    });
    await user.click(within(grant).getByRole('button', { name: 'Sí, autorizar' }));
    expect(clinicalClient.grantMyPhysioConsent).toHaveBeenCalled();
    expect(await screen.findByText(/Autorizado desde el/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirar autorización' }));
    const revoke = await screen.findByRole('alertdialog', { name: '¿Retirar la autorización?' });
    await user.click(within(revoke).getByRole('button', { name: 'Sí, retirar' }));
    expect(clinicalClient.revokeMyPhysioConsent).toHaveBeenCalled();
    expect(await screen.findByText(/No autorizado \(retirada el/)).toBeInTheDocument();
  });

  it('a plain USUARIO (not a player) does not see the physio authorization', async () => {
    renderMyCtcj('/mi-ctcj/perfil', { roles: ['USUARIO'] });
    await screen.findByRole('img', { name: 'Aún sin foto' });
    expect(screen.queryByText(/mis notas de fisioterapia/)).not.toBeInTheDocument();
    expect(clinicalClient.getMyPhysioConsent).not.toHaveBeenCalled();
  });

  it('requests a guardianship link with the chosen permissions and lists it', async () => {
    guardianshipClient.requestGuardianship.mockResolvedValue({ id: 'g1' });
    guardianshipClient.listMine.mockResolvedValueOnce({ guardianships: [] }).mockResolvedValue({
      guardianships: [{ id: 'g1', minorEmail: 'hijo@correo.com', status: 'PENDING' }],
    });
    const user = userEvent.setup();
    renderMyCtcj('/mi-ctcj/perfil');

    await user.type(await screen.findByLabelText('Correo del menor'), 'hijo@correo.com');
    await user.click(screen.getByRole('radio', { name: /Reservar y pagar/ }));
    await user.click(screen.getByRole('button', { name: 'Solicitar vinculación' }));

    expect(guardianshipClient.requestGuardianship).toHaveBeenCalledWith({
      minorEmail: 'hijo@correo.com',
      canBook: true,
      canPay: true,
    });
    const links = await screen.findByRole('list', { name: 'Tus vinculaciones' });
    expect(within(links).getByText('hijo@correo.com')).toBeInTheDocument();
    expect(within(links).getByText('En revisión')).toBeInTheDocument();
  });
});
