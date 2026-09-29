import { BUSINESS } from '@ctcj/shared';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';

import { ExternalLinkMark } from '../components/forms/ExternalLinkMark.jsx';
import { ChevronIcon } from '../components/icons/ChevronIcon.jsx';
import { FacebookIcon } from '../components/icons/FacebookIcon.jsx';
import { InstagramIcon } from '../components/icons/InstagramIcon.jsx';
import { TikTokIcon } from '../components/icons/TikTokIcon.jsx';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon.jsx';
import { ClubMark } from '../components/ui/ClubMark.jsx';
import { cn } from '../components/ui/cn.js';
import {
  CLUB_NAME,
  MAPS_LINK,
  PUBLISHED_SOCIAL_LINKS,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
} from '../lib/clubInfo.js';

import { LegalLinks } from './LegalLinks.jsx';

const SOCIAL_ICONS = { Instagram: InstagramIcon, Facebook: FacebookIcon, TikTok: TikTokIcon };

const NAV = [
  { to: '/canchas', label: 'Reservar una cancha' },
  { to: '/programas/adultos', label: 'Clases para adultos' },
  { to: '/programas/escuela-infantil', label: 'Escuela infantil' },
  { to: '/programas/competencia', label: 'Competencia y ranking' },
  { to: '/el-club', label: 'El club' },
  { to: '/mi-ctcj', label: 'Mi CTCJ' },
];

const LINK =
  'focus-ring inline-flex min-h-btn items-center rounded text-body font-semibold text-white underline underline-offset-4';

/**
 * A footer column. On phones its title is a button that opens and closes
 * it (they start closed so the footer stays short); from md up it is a
 * plain heading and the content is always visible.
 */
function Column({ title, children }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-white/15 md:border-0">
      <h2 className="font-display text-h3 font-bold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="focus-ring flex min-h-btn w-full items-center justify-between rounded text-left md:hidden"
        >
          {title}
          <ChevronIcon
            className={cn(
              'h-6 w-6 transition-transform duration-fast motion-reduce:transition-none',
              open ? '-rotate-90' : 'rotate-90',
            )}
          />
        </button>
        <span className="hidden md:inline">{title}</span>
      </h2>
      <div id={panelId} className={cn('pb-5 md:mt-3 md:block md:pb-0', !open && 'hidden')}>
        {children}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer id="contacto" className="bg-navy-500 text-white">
      <div className="mx-auto grid max-w-container gap-x-10 gap-y-2 px-4 py-12 md:grid-cols-2 md:gap-y-10 md:px-8 lg:grid-cols-[1.3fr_1fr_1.3fr_1fr]">
        <div className="pb-6 md:pb-0">
          <ClubMark tone="dark" size="md" />
          <p className="mt-4 font-display text-h3 font-bold">{CLUB_NAME}</p>
          <p className="mt-2 max-w-xs text-body text-white/85">
            Canchas de arcilla y la Academia Orlando Rodríguez en Fusagasugá.
          </p>
          {PUBLISHED_SOCIAL_LINKS.length > 0 && (
            <ul className="mt-4 flex gap-2" aria-label="Redes sociales">
              {PUBLISHED_SOCIAL_LINKS.map(({ network, url }) => {
                const Icon = SOCIAL_ICONS[network];
                return (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${network} (se abre en otro sitio)`}
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 text-white hover:bg-white/10"
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Column title="Navegar">
          <nav aria-label="Pie de página">
            <ul>
              {NAV.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Column>

        <Column title="Contacto">
          <address className="space-y-3 not-italic text-body text-white/85">
            <p>
              {BUSINESS.address}, {BUSINESS.city}
            </p>
            <p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(LINK, 'gap-2')}
              >
                <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                WhatsApp {WHATSAPP_NUMBER}
                <ExternalLinkMark />
              </a>
            </p>
            <p>Correo: {BUSINESS.contactEmail}</p>
            <p>Horario de atención: {BUSINESS.attentionHours}</p>
            <p>
              <a href={MAPS_LINK} target="_blank" rel="noopener noreferrer" className={LINK}>
                Cómo llegar
                <ExternalLinkMark />
              </a>
            </p>
          </address>
        </Column>

        <Column title="Legal">
          <LegalLinks tone="dark" layout="column" />
          <p className="mt-3 text-body-sm text-white/85">
            Datos personales: {BUSINESS.privacyEmail}
          </p>
        </Column>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto flex max-w-container flex-wrap gap-x-3 gap-y-1 px-4 py-5 text-body-sm text-white/85 md:px-8">
          <span>
            {BUSINESS.legalName} · NIT {BUSINESS.nit}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>
            © {new Date().getFullYear()} {CLUB_NAME}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>Hecho en Fusagasugá</span>
        </p>
      </div>
    </footer>
  );
}
