import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import { NAV_LINKS } from './Header.jsx';

export function MobileMenu({ isHome, onNavigate }) {
  const { status, logout } = useAuth();

  return (
    <div className="border-t border-neutral-200 bg-canvas lg:hidden" id="mobile-menu">
      <nav className="flex flex-col px-4 py-4" aria-label="Principal, móvil">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.hash}
            to={isHome ? link.hash : `/${link.hash}`}
            onClick={onNavigate}
            className="border-b border-neutral-100 py-3 font-display text-sm font-semibold uppercase tracking-wide text-secondary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 px-4 pb-6">
        {status === 'authenticated' ? (
          <>
            <Button to="/mi-ctcj" variant="ghost" onClick={onNavigate}>
              Mi CTCJ
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onNavigate();
                logout();
              }}
            >
              Cerrar sesión
            </Button>
          </>
        ) : (
          <Button to="/login" variant="ghost" onClick={onNavigate}>
            Ingresar
          </Button>
        )}
        <Button to="/canchas" variant="primary" onClick={onNavigate}>
          Reservar cancha
        </Button>
      </div>
    </div>
  );
}
