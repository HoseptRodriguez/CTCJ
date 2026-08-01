import { Link, useLocation } from 'react-router-dom';

import { Container } from '../components/ui/Container.jsx';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon.jsx';
import { InstagramIcon } from '../components/icons/InstagramIcon.jsx';
import { FacebookIcon } from '../components/icons/FacebookIcon.jsx';
import { TikTokIcon } from '../components/icons/TikTokIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import { NAV_LINKS } from './Header.jsx';

// Real, verified contact details from the club's own site source. Instagram,
// Facebook and TikTok URLs were never resolved even in that source (their
// links point at "#") -- only the shared handle is confirmed, so those three
// render as non-linked, labeled icons rather than invented URLs.
const WHATSAPP_NUMBER = '+57 310 864 6361';
const WHATSAPP_LINK = 'https://wa.me/573108646361';
const ADDRESS = 'Km 1 vía Fusagasugá – Tibacuy, junto al conjunto Toscana';
const SOCIAL_HANDLE = '@clubdetenisciudadjardin';

export function Footer() {
  const { status } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <footer className="bg-inverse text-on-inverse">
      <Container className="py-16 md:py-20">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <img
              src="/logo-insignia.png"
              alt="Club de Tenis Ciudad Jardín"
              className="mb-4 h-16 w-16"
            />
            <p className="max-w-[42ch] text-sm leading-relaxed text-on-inverse-muted">
              Academia Orlando Rodríguez. Más de una década haciendo del tenis el deporte número uno
              de la región, con formación de calidad, disciplina y trabajo en equipo.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href={WHATSAPP_LINK}
                aria-label={`WhatsApp del club: ${WHATSAPP_NUMBER}`}
                className="text-on-inverse-muted transition-colors duration-fast hover:text-on-inverse"
              >
                <WhatsAppIcon className="h-6 w-6" />
              </a>
              <span aria-label={`Instagram: ${SOCIAL_HANDLE}`} className="text-on-inverse-muted/60">
                <InstagramIcon className="h-6 w-6" />
              </span>
              <span aria-label={`Facebook: ${SOCIAL_HANDLE}`} className="text-on-inverse-muted/60">
                <FacebookIcon className="h-6 w-6" />
              </span>
              <span aria-label={`TikTok: ${SOCIAL_HANDLE}`} className="text-on-inverse-muted/60">
                <TikTokIcon className="h-6 w-6" />
              </span>
              <span className="text-xs text-on-inverse-muted/60">{SOCIAL_HANDLE}</span>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-wide text-on-inverse">
              Explorar
            </h4>
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.hash}>
                  <Link
                    to={isHome ? link.hash : `/${link.hash}`}
                    className="block py-1.5 text-sm text-on-inverse-muted transition-colors duration-fast hover:text-action"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-wide text-on-inverse">
              Jugadores
            </h4>
            <ul className="space-y-1">
              <li>
                <Link
                  to={status === 'authenticated' ? '/mi-ctcj' : '/login'}
                  className="block py-1.5 text-sm text-on-inverse-muted transition-colors duration-fast hover:text-action"
                >
                  {status === 'authenticated' ? 'Mi CTCJ' : 'Ingresar'}
                </Link>
              </li>
              <li>
                <Link
                  to="/canchas"
                  className="block py-1.5 text-sm text-on-inverse-muted transition-colors duration-fast hover:text-action"
                >
                  Reservar cancha
                </Link>
              </li>
              <li>
                <Link
                  to={isHome ? '#contacto' : '/#contacto'}
                  className="block py-1.5 text-sm text-on-inverse-muted transition-colors duration-fast hover:text-action"
                >
                  Inscríbete
                </Link>
              </li>
              <li>
                <Link
                  to={isHome ? '#contacto' : '/#contacto'}
                  className="block py-1.5 text-sm text-on-inverse-muted transition-colors duration-fast hover:text-action"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 text-xs text-on-inverse-muted">
          <span>
            © {new Date().getFullYear()} Club de Tenis Ciudad Jardín · Fusagasugá, Colombia
          </span>
          <span>
            {ADDRESS} · {WHATSAPP_NUMBER}
          </span>
        </div>
      </Container>
    </footer>
  );
}
