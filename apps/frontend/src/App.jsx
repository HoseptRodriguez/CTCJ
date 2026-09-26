import { ROLE_CODES } from '@ctcj/shared';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ToastProvider } from './components/ui/Toast.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { PublicLayout } from './layout/PublicLayout.jsx';
import { StaffLayout } from './layout/StaffLayout.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ReservationPage } from './pages/ReservationPage.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { MyCtcjLayout } from './layout/MyCtcjLayout.jsx';
import { RequireJugador } from './pages/mictcj/RequireJugador.jsx';
import { RequireAuth } from './routes/RequireAuth.jsx';
import { RequireRole } from './routes/RequireRole.jsx';
import { resolvePostLoginRoute } from './lib/postLoginRoute.js';

/**
 * Route-level code splitting: each heavy screen is its own chunk, so the
 * public site never downloads the staff console's charts (recharts) and the
 * console never downloads the home page's GSAP animations. Layouts show a
 * loading state inside their <Outlet> while a chunk arrives.
 */
function lazyPage(load, name) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const CommunityPage = lazyPage(() => import('./pages/CommunityPage.jsx'), 'CommunityPage');
const HomePage = lazyPage(() => import('./pages/HomePage.jsx'), 'HomePage');
const MyCtcjHome = lazyPage(() => import('./pages/mictcj/HomeTab.jsx'), 'HomeTab');
const MyReservations = lazyPage(
  () => import('./pages/mictcj/ReservationsTab.jsx'),
  'ReservationsTab',
);
const MyProgress = lazyPage(() => import('./pages/mictcj/ProgressTab.jsx'), 'ProgressTab');
const MyRanking = lazyPage(() => import('./pages/mictcj/RankingTab.jsx'), 'RankingTab');
const PlayerProfilePage = lazyPage(
  () => import('./pages/PlayerProfilePage.jsx'),
  'PlayerProfilePage',
);
const AdminDashboard = lazyPage(() => import('./pages/staff/AdminDashboard.jsx'), 'AdminDashboard');
const ClinicalPage = lazyPage(() => import('./pages/staff/ClinicalPage.jsx'), 'ClinicalPage');
const CoachDashboard = lazyPage(() => import('./pages/staff/CoachDashboard.jsx'), 'CoachDashboard');
const CoachNotesPage = lazyPage(() => import('./pages/staff/CoachNotesPage.jsx'), 'CoachNotesPage');
const CommunityModerationPage = lazyPage(
  () => import('./pages/staff/CommunityModerationPage.jsx'),
  'CommunityModerationPage',
);
const CompetitionPage = lazyPage(
  () => import('./pages/staff/CompetitionPage.jsx'),
  'CompetitionPage',
);
const CourtPricingPage = lazyPage(
  () => import('./pages/staff/CourtPricingPage.jsx'),
  'CourtPricingPage',
);
const FinancePage = lazyPage(() => import('./pages/staff/FinancePage.jsx'), 'FinancePage');
const MembershipStatusPage = lazyPage(
  () => import('./pages/staff/MembershipStatusPage.jsx'),
  'MembershipStatusPage',
);
const PaymentsQueuePage = lazyPage(
  () => import('./pages/staff/PaymentsQueuePage.jsx'),
  'PaymentsQueuePage',
);
const PlansPage = lazyPage(() => import('./pages/staff/PlansPage.jsx'), 'PlansPage');
const RequestsPage = lazyPage(() => import('./pages/staff/RequestsPage.jsx'), 'RequestsPage');
const TournamentsPage = lazyPage(
  () => import('./pages/staff/TournamentsPage.jsx'),
  'TournamentsPage',
);

// Design-system catalogue (/dev/ui). import.meta.env.DEV is statically false
// in production builds, so Vite drops this branch and the lazy chunk entirely.
const UiShowcase = import.meta.env.DEV
  ? lazy(() => import('./pages/dev/UiShowcase.jsx').then((m) => ({ default: m.UiShowcase })))
  : null;

// The bare /staff route has no content of its own -- land every role on
// their own dashboard, the same place login itself sends them
// (resolvePostLoginRoute.js), instead of a role-specific existing page.
function StaffHome() {
  const { user } = useAuth();
  return <Navigate to={resolvePostLoginRoute(user?.roles ?? [])} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/canchas" element={<ReservationPage />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
            </Route>

            {/* Mi CTCJ: its own shell (header with tabs), any signed-in user. */}
            <Route element={<RequireAuth />}>
              <Route element={<MyCtcjLayout />}>
                <Route path="/mi-ctcj" element={<MyCtcjHome />} />
                <Route path="/mi-ctcj/reservas" element={<MyReservations />} />
                <Route path="/mi-ctcj/perfil" element={<PlayerProfilePage />} />
                <Route element={<RequireJugador />}>
                  <Route path="/mi-ctcj/progreso" element={<MyProgress />} />
                  <Route path="/mi-ctcj/ranking" element={<MyRanking />} />
                  <Route path="/mi-ctcj/comunidad" element={<CommunityPage />} />
                </Route>
              </Route>
            </Route>

            <Route
              element={
                <RequireRole
                  roles={[
                    ROLE_CODES.ADMINISTRADOR,
                    ROLE_CODES.RECEPCION,
                    ROLE_CODES.ENTRENADOR,
                    ROLE_CODES.PSICOLOGO,
                    ROLE_CODES.NEUROPSICOLOGO,
                    ROLE_CODES.FISIOTERAPEUTA,
                  ]}
                />
              }
            >
              <Route element={<StaffLayout />}>
                <Route path="/staff" element={<StaffHome />} />
                <Route path="/staff/competicion" element={<CompetitionPage />} />
                <Route path="/staff/torneos" element={<TournamentsPage />} />
                <Route
                  element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]} />}
                >
                  <Route path="/staff/panel" element={<AdminDashboard />} />
                  <Route path="/staff/pagos" element={<PaymentsQueuePage />} />
                  <Route path="/staff/membresias" element={<MembershipStatusPage />} />
                  <Route path="/staff/comunidad" element={<CommunityModerationPage />} />
                </Route>
                <Route
                  element={
                    <RequireRole roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.ENTRENADOR]} />
                  }
                >
                  <Route path="/staff/panel-entrenador" element={<CoachDashboard />} />
                  <Route path="/staff/notas" element={<CoachNotesPage />} />
                </Route>
                <Route
                  element={
                    <RequireRole
                      roles={[
                        ROLE_CODES.ADMINISTRADOR,
                        ROLE_CODES.RECEPCION,
                        ROLE_CODES.PSICOLOGO,
                        ROLE_CODES.NEUROPSICOLOGO,
                        ROLE_CODES.FISIOTERAPEUTA,
                      ]}
                    />
                  }
                >
                  <Route path="/staff/clinico" element={<ClinicalPage />} />
                </Route>
                <Route element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR]} />}>
                  <Route path="/staff/precios" element={<CourtPricingPage />} />
                  <Route path="/staff/solicitudes" element={<RequestsPage />} />
                  <Route path="/staff/planes" element={<PlansPage />} />
                  <Route path="/staff/finanzas" element={<FinancePage />} />
                </Route>
              </Route>
            </Route>

            {UiShowcase && (
              <Route
                path="/dev/ui"
                element={
                  <Suspense fallback={null}>
                    <UiShowcase />
                  </Suspense>
                }
              />
            )}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
