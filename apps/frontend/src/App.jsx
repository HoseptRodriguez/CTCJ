import { ROLE_CODES } from '@ctcj/shared';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { PublicLayout } from './layout/PublicLayout.jsx';
import { StaffLayout } from './layout/StaffLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { Login } from './pages/Login.jsx';
import { MyCtcjPage } from './pages/MyCtcjPage.jsx';
import { Register } from './pages/Register.jsx';
import { ReservationPage } from './pages/ReservationPage.jsx';
import { CourtPricingPage } from './pages/staff/CourtPricingPage.jsx';
import { MembershipStatusPage } from './pages/staff/MembershipStatusPage.jsx';
import { PaymentsQueuePage } from './pages/staff/PaymentsQueuePage.jsx';
import { PlansPage } from './pages/staff/PlansPage.jsx';
import { RequestsPage } from './pages/staff/RequestsPage.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { RequireAuth } from './routes/RequireAuth.jsx';
import { RequireRole } from './routes/RequireRole.jsx';

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

          <Route element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]} />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff" element={<Navigate to="/staff/pagos" replace />} />
              <Route path="/staff/pagos" element={<PaymentsQueuePage />} />
              <Route path="/staff/membresias" element={<MembershipStatusPage />} />
              <Route element={<RequireRole roles={[ROLE_CODES.ADMINISTRADOR]} />}>
                <Route path="/staff/precios" element={<CourtPricingPage />} />
                <Route path="/staff/solicitudes" element={<RequestsPage />} />
                <Route path="/staff/planes" element={<PlansPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
