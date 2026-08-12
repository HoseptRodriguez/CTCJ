import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button.jsx';

/**
 * Mirrors the public site's MobileMenu.jsx pattern (same breakpoint, same
 * "collapsible panel under the header" shape) -- StaffLayout computes which
 * links are visible for the current role and passes them down already
 * filtered, so this component stays purely presentational and doesn't need
 * to know about roles at all.
 *
 * @param {{ navItems: {to: string, label: string}[], onNavigate: () => void, onLogout: () => void }} props
 */
export function StaffMobileMenu({ navItems, onNavigate, onLogout }) {
  return (
    <div className="border-t border-neutral-200 bg-canvas lg:hidden" id="staff-mobile-menu">
      <nav className="flex flex-col px-4 py-2" aria-label="Staff, móvil">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="border-b border-neutral-100 py-3 font-display text-sm font-semibold uppercase tracking-wide text-secondary"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 px-4 pb-6 pt-2">
        <Link to="/" onClick={onNavigate} className="py-2 text-sm text-tertiary">
          Ir al sitio público
        </Link>
        <Button
          variant="outline"
          onClick={() => {
            onNavigate();
            onLogout();
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
