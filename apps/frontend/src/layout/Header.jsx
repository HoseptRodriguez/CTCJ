import { ROLE_CODES } from '@ctcj/shared';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CalendarIcon } from '../components/icons/CalendarIcon.jsx';
import { CloseIcon } from '../components/icons/CloseIcon.jsx';
import { MenuIcon } from '../components/icons/MenuIcon.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ClubMark } from '../components/ui/ClubMark.jsx';
import { FontSizeToggle } from '../components/ui/FontSizeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { resolvePostLoginRoute } from '../lib/postLoginRoute.js';

import { MobileMenu } from './MobileMenu.jsx';
import { NotificationBell } from './NotificationBell.jsx';

const STAFF_ROLES = [
  ROLE_CODES.ADMINISTRADOR,
  ROLE_CODES.RECEPCION,
  ROLE_CODES.ENTRENADOR,
  ROLE_CODES.PSICOLOGO,
  ROLE_CODES.NEUROPSICOLOGO,
  ROLE_CODES.FISIOTERAPEUTA,
];

export const NAV_LINKS = [
  { label: 'Clases y academia', to: '/#clases' },
  { label: 'El club', to: '/el-club' },
  { label: 'Contacto', to: '/#contacto' },
];

/** Where "my area" is for this person: the staff console panel of their role, or Mi CTCJ. */
export function accountLinkFor(roles = []) {
  const isStaff = roles.some((role) => STAFF_ROLES.includes(role));
  return isStaff
    ? { to: resolvePostLoginRoute(roles), label: 'Consola del club' }
    : { to: '/mi-ctcj', label: 'Mi CTCJ' };
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const account = accountLinkFor(user?.roles);

  // Close the phone menu whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-header bg-navy-500 text-white shadow-md">
      <div className="mx-auto flex min-h-[84px] max-w-container items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link
          to="/"
          className="focus-ring flex min-h-btn min-w-0 items-center gap-2 rounded-lg sm:gap-3 xl:shrink-0"
          aria-label="Club de Tenis Ciudad Jardín, inicio"
        >
          {/* Smaller mark on phones and when the full menu shares the row. */}
          <ClubMark tone="dark" size="sm" className="sm:hidden xl:inline-block" />
          <ClubMark tone="dark" size="md" className="hidden sm:inline-block xl:hidden" />
          <span className="flex min-w-0 flex-col leading-tight sm:whitespace-nowrap">
            <strong className="font-display text-h3 font-bold">Ciudad Jardín</strong>
            <span className="hidden text-body-sm text-white/85 sm:block">
              Club de Tenis · Fusagasugá
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="focus-ring inline-flex min-h-btn items-center whitespace-nowrap rounded-lg px-3 text-body font-semibold text-white hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
          <FontSizeToggle tone="dark" />
          {status === 'authenticated' ? (
            <>
              <NotificationBell tone="dark" />
              <Button tone="dark" variant="secondary" to={account.to}>
                {account.label}
              </Button>
              <Button tone="dark" variant="ghost" onClick={logout}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button tone="dark" variant="secondary" to="/login">
              Entrar
            </Button>
          )}
          <Button tone="dark" to="/canchas" icon={<CalendarIcon />}>
            Reservar cancha
          </Button>
        </div>

        {/* Phones: the bell stays next to the menu button, never buried. */}
        <div className="flex items-center gap-2 lg:hidden">
          {status === 'authenticated' ? <NotificationBell tone="dark" /> : null}
          <button
            type="button"
            className="focus-ring inline-flex min-h-btn items-center gap-2 rounded-lg border-2 border-white px-3 text-body font-semibold text-white"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            <span aria-hidden="true">Menú</span>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <MobileMenu account={account} onNavigate={() => setMobileOpen(false)} onLogout={logout} />
      ) : null}
    </header>
  );
}
