import { BUSINESS } from '@ctcj/shared';
import { Link } from 'react-router-dom';

import { cn } from '../components/ui/cn.js';
import { openCookieSettings } from '../lib/cookieSettingsEvent.js';
import { LEGAL_PAGES } from '../pages/legal/LegalPage.jsx';

/**
 * Links to every legal page plus "Configurar cookies" -- in the footer of
 * every screen (public site, Mi CTCJ and the staff console).
 * `tone="dark"` on navy backgrounds.
 */
export function LegalLinks({ tone = 'light', className }) {
  const linkClass = cn(
    'focus-ring inline-flex min-h-btn items-center rounded text-body font-semibold underline underline-offset-4',
    tone === 'dark' ? 'text-white' : 'text-navy-500',
  );
  return (
    <nav aria-label="Documentos legales" className={className}>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {LEGAL_PAGES.map(({ doc, label }) => (
          <li key={doc.path}>
            <Link to={doc.path} className={linkClass}>
              {label}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" onClick={openCookieSettings} className={linkClass}>
            Configurar cookies
          </button>
        </li>
        <li>
          {/* Notices required by the licenses of the icons and fonts (docs/LICENCIAS.md). */}
          <a href="/licencias-terceros.txt" className={linkClass}>
            Avisos de terceros
          </a>
        </li>
      </ul>
    </nav>
  );
}

/** Who runs the site (Ley 1480 de 2011, art. 50). */
export function BusinessDetails({ className }) {
  return (
    <address className={cn('not-italic', className)}>
      <p>
        {BUSINESS.legalName} · NIT {BUSINESS.nit}
      </p>
      <p>
        {BUSINESS.address}, {BUSINESS.city}
      </p>
      <p>
        Teléfono y WhatsApp {BUSINESS.phone} · {BUSINESS.contactEmail}
      </p>
      <p>Datos personales: {BUSINESS.privacyEmail}</p>
    </address>
  );
}
