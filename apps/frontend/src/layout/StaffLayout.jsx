import { ROLE_CODES } from '@ctcj/shared';
import { Link, Outlet } from 'react-router-dom';

import { Button } from '../components/ui/Button.jsx';
import { Container } from '../components/ui/Container.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Minimal chrome for the internal staff area -- deliberately not the public
// marketing Header/Footer/PublicLayout, which are a different product surface.
export function StaffLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.roles?.includes(ROLE_CODES.ADMINISTRADOR);

  return (
    <div className="flex min-h-screen flex-col bg-sunken">
      <header className="border-b border-neutral-200 bg-canvas">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/staff/pagos" className="font-display text-lg font-semibold text-primary">
              Ciudad Jardín · Staff
            </Link>
            <nav className="flex items-center gap-4" aria-label="Staff">
              <Link
                to="/staff/pagos"
                className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
              >
                Pagos
              </Link>
              <Link
                to="/staff/membresias"
                className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
              >
                Membresías
              </Link>
              {isAdmin ? (
                <Link
                  to="/staff/precios"
                  className="font-display text-sm font-semibold uppercase tracking-wide text-secondary"
                >
                  Precios
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-tertiary">
              Ir al sitio público
            </Link>
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
