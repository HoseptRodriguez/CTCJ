import { ROLE_CODES } from '@ctcj/shared';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { PublicLayout } from './layout/PublicLayout.jsx';
import { StaffLayout } from './layout/StaffLayout.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { Login } from './pages/Login.jsx';
import { MyCtcjPage } from './pages/MyCtcjPage.jsx';
import { Register } from './pages/Register.jsx';
import { ReservationPage } from './pages/ReservationPage.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { AdminDashboard } from './pages/staff/AdminDashboard.jsx';
import { ClinicalPage } from './pages/staff/ClinicalPage.jsx';
import { CoachDashboard } from './pages/staff/CoachDashboard.jsx';
import { CoachNotesPage } from './pages/staff/CoachNotesPage.jsx';
import { CompetitionPage } from './pages/staff/CompetitionPage.jsx';
import { CourtPricingPage } from './pages/staff/CourtPricingPage.jsx';
import { FinancePage } from './pages/staff/FinancePage.jsx';
import { MembershipStatusPage } from './pages/staff/MembershipStatusPage.jsx';
import { PaymentsQueuePage } from './pages/staff/PaymentsQueuePage.jsx';
import { PlansPage } from './pages/staff/PlansPage.jsx';
import { RequestsPage } from './pages/staff/RequestsPage.jsx';
import { TournamentsPage } from './pages/staff/TournamentsPage.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { RequireAuth } from './routes/RequireAuth.jsx';
import { RequireRole } from './routes/RequireRole.jsx';
import { resolvePostLoginRoute } from './lib/postLoginRoute.js';

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
            <Route element={<RequireAuth />}>
              <Route path="/mi-ctcj" element={<MyCtcjPage />} />
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
              </Route>
              <Route
                element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.ENTRENADOR]} />}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
