import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { resolvePostLoginRoute } from '../lib/postLoginRoute.js';

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

  // Authenticated but lacking any of the allowed roles -- send them to
  // their own dashboard, not the public homepage (they're already logged
  // in, just trying to reach a route that isn't theirs).
  if (!roles.some((role) => user.roles.includes(role))) {
    return <Navigate to={resolvePostLoginRoute(user.roles)} replace />;
  }

  return <Outlet />;
}
