import { ROLE_CODES } from '@ctcj/shared';
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { Button } from '../components/ui/Button.jsx';
import { Container } from '../components/ui/Container.jsx';
import { CloseIcon } from '../components/icons/CloseIcon.jsx';
import { MenuIcon } from '../components/icons/MenuIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import { NotificationBell } from './NotificationBell.jsx';
import { StaffMobileMenu } from './StaffMobileMenu.jsx';

const NAV_LINK_CLASS = 'font-display text-sm font-semibold uppercase tracking-wide text-secondary';

// Minimal chrome for the internal staff area -- deliberately not the public
// marketing Header/Footer/PublicLayout, which are a different product surface.
export function StaffLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Computed once, shared by both the desktop row and the mobile panel below
  // -- one role-gating source of truth instead of duplicating the same
  // conditionals in two places (see StaffMobileMenu.jsx, which stays purely
  // presentational as a result).
  const navItems = [
    canSeePagos && { to: '/staff/pagos', label: 'Pagos' },
    canSeePagos && { to: '/staff/membresias', label: 'Membresías' },
    canSeeNotas && { to: '/staff/notas', label: 'Notas' },
    canSeePagos && { to: '/staff/comunidad', label: 'Comunidad' },
    { to: '/staff/competicion', label: 'Competición' },
    { to: '/staff/torneos', label: 'Torneos' },
    canSeeClinical && { to: '/staff/clinico', label: 'Salud y bienestar' },
    isAdmin && { to: '/staff/precios', label: 'Precios' },
    isAdmin && { to: '/staff/solicitudes', label: 'Solicitudes' },
    isAdmin && { to: '/staff/planes', label: 'Planes' },
    isAdmin && { to: '/staff/finanzas', label: 'Finanzas' },
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col bg-sunken">
      <header className="border-b border-neutral-200 bg-canvas">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              to={homeTarget}
              className="shrink-0 font-display text-lg font-semibold text-primary"
            >
              Ciudad Jardín · Staff
            </Link>
            <nav className="hidden items-center gap-4 lg:flex" aria-label="Staff">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className={NAV_LINK_CLASS}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/" className="text-sm text-tertiary">
              Ir al sitio público
            </Link>
            <NotificationBell />
            <Button variant="outline" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>

          {/* Below `lg`, the full link row (up to 11 items) has nowhere to
              go -- collapse to a hamburger + panel, exactly mirroring the
              public site's Header.jsx/MobileMenu.jsx pattern. Notifications
              stay reachable at all times (unlike the public header, which
              hides its bell on mobile too) -- there's no reason to bury a
              staff member's own inbox behind an extra tap. */}
          <div className="flex items-center gap-2 lg:hidden">
            <NotificationBell />
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-md text-primary"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
              aria-controls="staff-mobile-menu"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </Container>

        {mobileOpen ? (
          <StaffMobileMenu
            navItems={navItems}
            onNavigate={() => setMobileOpen(false)}
            onLogout={logout}
          />
        ) : null}
      </header>

      <main className="flex-1">
        <Container className="py-10">
          <Outlet />
        </Container>
      </main>
    </div>
  );
}
