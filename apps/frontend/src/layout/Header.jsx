import { ROLE_CODES } from '@ctcj/shared';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '../components/ui/Button.jsx';
import { Container } from '../components/ui/Container.jsx';
import { MenuIcon } from '../components/icons/MenuIcon.jsx';
import { CloseIcon } from '../components/icons/CloseIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STAFF_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION];

import { MobileMenu } from './MobileMenu.jsx';

export const NAV_LINKS = [
  { label: 'El Club', hash: '#club' },
  { label: 'Academia', hash: '#academia' },
  { label: 'Instalaciones', hash: '#instalaciones' },
  { label: 'Ranking CTCJ', hash: '#ranking' },
  { label: 'Contacto', hash: '#contacto' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isStaff = user?.roles?.some((role) => STAFF_ROLES.includes(role));

  return (
    <header className="sticky top-0 z-header border-b border-neutral-200 bg-canvas/95 backdrop-blur">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Link
          to="/"
          className="flex items-center gap-3"
          aria-label="Club de Tenis Ciudad Jardín, inicio"
        >
          <img src="/logo-insignia.png" alt="" className="h-10 w-10" />
          <span className="flex flex-col leading-tight">
            <strong className="font-display text-lg font-semibold text-primary">
              Ciudad Jardín
            </strong>
            <span className="text-xs text-tertiary">Academia Orlando Rodríguez</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.hash}
              to={isHome ? link.hash : `/${link.hash}`}
              className="font-display text-sm font-semibold uppercase tracking-wide text-secondary transition-colors duration-fast hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {status === 'authenticated' ? (
            <>
              {isStaff ? (
                <Button to="/staff/pagos" variant="ghost">
                  Staff
                </Button>
              ) : null}
              <Button to="/mi-ctcj" variant="ghost">
                Mi CTCJ
              </Button>
              <Button onClick={logout} variant="outline">
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button to="/login" variant="ghost">
              Ingresar
            </Button>
          )}
          <Button to="/canchas" variant="primary">
            Reservar cancha
          </Button>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-md text-primary lg:hidden"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </Container>

      {mobileOpen ? <MobileMenu isHome={isHome} onNavigate={() => setMobileOpen(false)} /> : null}
    </header>
  );
}
