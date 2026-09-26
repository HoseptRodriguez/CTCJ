/**
 * Test helpers for the Mi CTCJ area. Each test file declares its own
 * vi.mock() calls for the API clients (they must be hoisted in the file);
 * this module then fills every mocked client with an "empty account" and
 * renders the real layout + routes at any path, for any roles.
 */
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { challengesClient } from '../../api/challengesClient.js';
import { clinicalClient } from '../../api/clinicalClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { communityClient } from '../../api/communityClient.js';
import { competitionClient } from '../../api/competitionClient.js';
import { goalsClient } from '../../api/goalsClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { notificationsClient } from '../../api/notificationsClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { MyCtcjLayout } from '../../layout/MyCtcjLayout.jsx';
import { CommunityPage } from '../CommunityPage.jsx';
import { PlayerProfilePage } from '../PlayerProfilePage.jsx';

import { HomeTab } from './HomeTab.jsx';
import { ProgressTab } from './ProgressTab.jsx';
import { RankingTab } from './RankingTab.jsx';
import { ReservationsTab } from './ReservationsTab.jsx';
import { RequireJugador } from './RequireJugador.jsx';

/** The vi.mock() factories every Mi CTCJ test file uses (copy into vi.mock calls). */
export const CLIENT_METHODS = {
  affiliationClient: ['getMyRequests', 'submitRequest'],
  billingClient: ['getMyMemberships', 'getMyInvoices'],
  bookingClient: ['getMyReservations', 'getSchedule', 'cancel'],
  challengesClient: [
    'createChallenge',
    'getMyChallenges',
    'acceptChallenge',
    'rejectChallenge',
    'cancelChallenge',
    'submitMatchScore',
  ],
  clinicalClient: ['getMyAppointments', 'getMyNotes', 'getMyRecoveryPlans', 'getMyMedicalHistory'],
  coachingClient: ['getMyNotes', 'getMyPerformance'],
  communityClient: ['listPosts'],
  competitionClient: ['getMyCompetitionSummary', 'getRecentClubMatches', 'getStandings'],
  goalsClient: ['getMyGoals', 'createGoal', 'abandonGoal'],
  guardianshipClient: ['listMine', 'requestGuardianship'],
  membershipClient: [
    'getMyStatus',
    'getMyProfile',
    'searchPlayers',
    'updateMyProfile',
    'uploadMyAvatar',
    'getMyAchievements',
  ],
  notificationsClient: ['getMyNotifications', 'markNotificationRead', 'markAllNotificationsRead'],
  tournamentClient: ['listTournaments'],
};

export const PROFILE = {
  id: 'u1',
  firstName: 'Ana',
  lastName: 'Gomez',
  email: 'ana@example.com',
  phone: null,
  birthDate: null,
  bio: null,
  avatarUrl: null,
};

/** Every source answers "nothing yet". Override per test afterwards. */
export function setEmptyAccount() {
  affiliationClient.getMyRequests.mockResolvedValue({ requests: [] });
  billingClient.getMyMemberships.mockResolvedValue({ memberships: [] });
  billingClient.getMyInvoices.mockResolvedValue({ invoices: [] });
  bookingClient.getMyReservations.mockResolvedValue({ reservations: [] });
  bookingClient.cancel.mockResolvedValue({ status: 'CANCELLED', withoutPenalty: true });
  challengesClient.getMyChallenges.mockResolvedValue({ challenges: [] });
  clinicalClient.getMyAppointments.mockResolvedValue({ appointments: [] });
  clinicalClient.getMyNotes.mockResolvedValue({ notes: [] });
  clinicalClient.getMyRecoveryPlans.mockResolvedValue({ plans: [] });
  clinicalClient.getMyMedicalHistory.mockResolvedValue({ entries: [] });
  coachingClient.getMyNotes.mockResolvedValue({ notes: [] });
  coachingClient.getMyPerformance.mockResolvedValue({
    ratings: [],
    summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} },
  });
  communityClient.listPosts.mockResolvedValue({ posts: [] });
  competitionClient.getMyCompetitionSummary.mockResolvedValue({
    hasSeason: false,
    categories: [],
    recentMatches: [],
  });
  competitionClient.getRecentClubMatches.mockResolvedValue({ matches: [] });
  competitionClient.getStandings.mockResolvedValue({ standings: [] });
  goalsClient.getMyGoals.mockResolvedValue({ goals: [] });
  guardianshipClient.listMine.mockResolvedValue({ guardianships: [] });
  membershipClient.getMyProfile.mockResolvedValue(PROFILE);
  membershipClient.getMyStatus.mockResolvedValue({ status: 'ACTIVE' });
  membershipClient.getMyAchievements.mockResolvedValue({ badges: [] });
  notificationsClient.getMyNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
  tournamentClient.listTournaments.mockResolvedValue({ tournaments: [] });
}

function Where() {
  const location = useLocation();
  return <p>Ruta: {`${location.pathname}${location.search}`}</p>;
}

/** Renders Mi CTCJ exactly as App.jsx mounts it, at `path`, signed in with `roles`. */
export function renderMyCtcj(path = '/mi-ctcj', { roles = ['USUARIO', 'JUGADOR'] } = {}) {
  useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles }, logout: vi.fn() });
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<MyCtcjLayout />}>
            <Route path="/mi-ctcj" element={<HomeTab />} />
            <Route path="/mi-ctcj/reservas" element={<ReservationsTab />} />
            <Route path="/mi-ctcj/perfil" element={<PlayerProfilePage />} />
            <Route element={<RequireJugador />}>
              <Route path="/mi-ctcj/progreso" element={<ProgressTab />} />
              <Route path="/mi-ctcj/ranking" element={<RankingTab />} />
              <Route path="/mi-ctcj/comunidad" element={<CommunityPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}
