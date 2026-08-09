import { ROLE_CODES } from '@ctcj/shared';
import { Link, Outlet } from 'react-router-dom';

import { Button } from '../components/ui/Button.jsx';
import { Container } from '../components/ui/Container.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import { NotificationBell } from './NotificationBell.jsx';

// Minimal chrome for the internal staff area -- deliberately not the public
// marketing Header/Footer/PublicLayout, which are a different product surface.
export function StaffLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.roles?.includes(ROLE_CODES.ADMINISTRADOR);
  const isRecepcion = user?.roles?.includes(ROLE_CODES.RECEPCION);
  const isEntrenador = user?.roles?.includes(ROLE_CODES.ENTRENADOR);
  const isPsicologo = user?.roles?.includes(ROLE_CODES.PSICOLOGO);
  const isNeuropsicologo = user?.roles?.includes(ROLE_CODES.NEUROPSICOLOGO);
  const isFisioterapeuta = user?.roles?.includes(ROLE_CODES.FISIOTERAPEUTA);
  const canSeePagos = isAdmin || isRecepcion;
  const canSeeNotas = isAdmin || isEntrenador;
  const canSeeClinical =
    isAdmin || isRecepcion || isPsicologo || isNeuropsicologo || isFisioterapeuta;
  const homeTarget = canSeePagos ? '/staff/pagos' : canSeeNotas ? '/staff/notas' : '/staff/clinico';

  return (
    <div className="flex min-h-screen flex-col bg-sunken">
      <header className="border-b border-neutral-200 bg-canvas">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={homeTarget} className="font-display text-lg font-semibold text-primary">
              Ciudad Jardín · Staff
            </Link>
            <nav className="flex items-center gap-4" aria-label="Staff">
              {canSeePagos ? (
                <Link
                  to="/staff/pagos"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Pagos
                </Link>
              ) : null}
              {canSeePagos ? (
                <Link
                  to="/staff/membresias"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Membresías
                </Link>
              ) : null}
              {canSeeNotas ? (
                <Link
                  to="/staff/notas"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Notas
                </Link>
              ) : null}
              {canSeePagos ? (
                <Link
                  to="/staff/comunidad"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Comunidad
                </Link>
              ) : null}
              <Link
                to="/staff/competicion"
                className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
              >
                Competición
              </Link>
              <Link
                to="/staff/torneos"
                className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
              >
                Torneos
              </Link>
              {canSeeClinical ? (
                <Link
                  to="/staff/clinico"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Salud y bienestar
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  to="/staff/precios"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Precios
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  to="/staff/solicitudes"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Solicitudes
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  to="/staff/planes"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Planes
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  to="/staff/finanzas"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Finanzas
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-tertiary">
              Ir al sitio público
            </Link>
            <NotificationBell />
            <Button variant="outline" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </Container>
      </header>

      <main className="flex-1">
        <Container className="py-10">
          <Outlet />
        </Container>
      </main>
    </div>
  );
}
