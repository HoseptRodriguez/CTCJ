import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { PublicLayout } from './layout/PublicLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { Login } from './pages/Login.jsx';
import { MyCtcjPage } from './pages/MyCtcjPage.jsx';
import { Register } from './pages/Register.jsx';
import { ReservationPage } from './pages/ReservationPage.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { RequireAuth } from './routes/RequireAuth.jsx';

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
