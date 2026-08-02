import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/** @param {{ roles: string[] }} props -- allowed role codes (OR semantics). */
export function RequireRole({ roles }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="text-sm text-secondary">Cargando...</span>
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but lacking any of the allowed roles -- send them home,
  // not to login (they're already logged in, just not staff).
  if (!roles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
