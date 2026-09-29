import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { authClient } from '../../api/authClient.js';
import { MfaSetupSteps } from '../../components/mfa/MfaSetupSteps.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { resolvePostLoginRoute } from '../../lib/postLoginRoute.js';

import { AuthSplit } from './AuthSplit.jsx';

/**
 * /activar-verificacion — right after the password, for a role that
 * requires two-step verification and doesn't have it yet. Only when it's
 * on (and the recovery codes are saved) does the session open.
 */
export function MfaSetupPage() {
  useDocumentTitle('Activar la verificación en dos pasos');
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const mfaToken = location.state?.mfaToken;
  const from = location.state?.from;

  // Reached without signing in first (a reload, a bookmark): back to the start.
  if (!mfaToken) return <Navigate to="/login" replace />;

  function enter(session) {
    login(session);
    const internal = typeof from?.pathname === 'string' && /^\/(?![/\\])/.test(from.pathname);
    navigate(
      internal ? `${from.pathname}${from.search ?? ''}` : resolvePostLoginRoute(session.roles),
      {
        replace: true,
      },
    );
  }

  return (
    <AuthSplit
      title="Activa la verificación en dos pasos"
      tagline="Tu cuenta cuida datos del club."
      description="Por tu rol en el club, además de la contraseña necesitas un código que genera tu teléfono. Solo lo configuras una vez y toma unos 3 minutos."
    >
      <MfaSetupSteps
        start={() => authClient.mfaSetupStart(mfaToken)}
        confirm={(code) => authClient.mfaSetupConfirm(mfaToken, code)}
        onFinished={enter}
        finishLabel="Entrar a la consola"
      />
    </AuthSplit>
  );
}
