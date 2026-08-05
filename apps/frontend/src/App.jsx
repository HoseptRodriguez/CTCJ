import { ROLE_CODES } from '@ctcj/shared';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { PublicLayout } from './layout/PublicLayout.jsx';
import { StaffLayout } from './layout/StaffLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { Login } from './pages/Login.jsx';
import { MyCtcjPage } from './pages/MyCtcjPage.jsx';
import { Register } from './pages/Register.jsx';
import { ReservationPage } from './pages/ReservationPage.jsx';
import { CoachNotesPage } from './pages/staff/CoachNotesPage.jsx';
import { CourtPricingPage } from './pages/staff/CourtPricingPage.jsx';
import { FinancePage } from './pages/staff/FinancePage.jsx';
import { MembershipStatusPage } from './pages/staff/MembershipStatusPage.jsx';
import { PaymentsQueuePage } from './pages/staff/PaymentsQueuePage.jsx';
import { PlansPage } from './pages/staff/PlansPage.jsx';
import { RequestsPage } from './pages/staff/RequestsPage.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { RequireAuth } from './routes/RequireAuth.jsx';
import { RequireRole } from './routes/RequireRole.jsx';

// /staff/pagos isn't reachable by every staff role (Phase 10 added ENTRENADOR,
// which can't see Pagos/Membresías) -- a static <Navigate> would bounce a
// coach's first visit straight through to "/" via RequireRole's own
// lacking-role fallback. Land each role on a route they can actually see.
function StaffHome() {
  const { user } = useAuth();
  const canSeePagos =
    user?.roles?.includes(ROLE_CODES.ADMINISTRADOR) || user?.roles?.includes(ROLE_CODES.RECEPCION);
  return <Navigate to={canSeePagos ? '/staff/pagos' : '/staff/notas'} replace />;
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
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route element={<RequireAuth />}>
              <Route path="/mi-ctcj" element={<MyCtcjPage />} />
            </Route>
          </Route>

          <Route
            element={
              <RequireRole
                roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION, ROLE_CODES.ENTRENADOR]}
              />
            }
          >
            <Route element={<StaffLayout />}>
              <Route path="/staff" element={<StaffHome />} />
              <Route
                element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]} />}
              >
                <Route path="/staff/pagos" element={<PaymentsQueuePage />} />
                <Route path="/staff/membresias" element={<MembershipStatusPage />} />
              </Route>
              <Route
                element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.ENTRENADOR]} />}
              >
                <Route path="/staff/notas" element={<CoachNotesPage />} />
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
