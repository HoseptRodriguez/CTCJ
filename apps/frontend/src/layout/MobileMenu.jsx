import { Link } from 'react-router-dom';

import { CalendarIcon } from '../components/icons/CalendarIcon.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FontSizeToggle } from '../components/ui/FontSizeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import { NAV_LINKS } from './Header.jsx';

/** Phone menu of the public header: big links, then the account actions. */
export function MobileMenu({ account, onNavigate, onLogout }) {
  const { status } = useAuth();

  return (
    <div className="border-t border-white/20 bg-navy-500 lg:hidden" id="mobile-menu">
      <nav className="flex flex-col px-4 py-2" aria-label="Principal, móvil">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className="focus-ring flex min-h-btn-lg items-center border-b border-white/15 px-2 text-lead font-semibold text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 px-4 pb-6 pt-2">
        <Button
          tone="dark"
          size="lg"
          to="/canchas"
          icon={<CalendarIcon />}
          onClick={onNavigate}
          fullWidth
        >
          Reservar cancha
        </Button>
        {status === 'authenticated' ? (
          <>
            <Button tone="dark" variant="secondary" to={account.to} onClick={onNavigate} fullWidth>
              {account.label}
            </Button>
            <Button
              tone="dark"
              variant="ghost"
              fullWidth
              onClick={() => {
                onNavigate();
                onLogout();
              }}
            >
              Cerrar sesión
            </Button>
          </>
        ) : (
          <Button tone="dark" variant="secondary" to="/login" onClick={onNavigate} fullWidth>
            Entrar
          </Button>
        )}
        <FontSizeToggle tone="dark" className="justify-center" />
      </div>
    </div>
  );
}
