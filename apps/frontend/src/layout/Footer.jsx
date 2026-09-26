import { Link } from 'react-router-dom';

import { WhatsAppIcon } from '../components/icons/WhatsAppIcon.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  ADDRESS,
  CLUB_NAME,
  SOCIAL_HANDLE,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
} from '../lib/clubInfo.js';

const LINKS = [
  { to: '/canchas', label: 'Reservar una cancha' },
  { to: '/mi-ctcj', label: 'Mi CTCJ' },
  { to: '/#clases', label: 'Clases y academia' },
  { to: '/login', label: 'Entrar' },
];

export function Footer() {
  return (
    <footer id="contacto" className="bg-navy-500 text-white">
      <div className="mx-auto grid max-w-container gap-10 px-4 py-12 md:grid-cols-3 md:px-8">
        <div>
          <p className="font-display text-h3 font-bold">{CLUB_NAME}</p>
          <p className="mt-2 text-body text-white/85">Academia Orlando Rodríguez · Fusagasugá</p>
        </div>

        <div>
          <h2 className="font-display text-h3 font-bold">¿Tienes preguntas?</h2>
          <p className="mt-2 text-body text-white/85">Escríbenos por WhatsApp y te respondemos.</p>
          <Button
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            tone="dark"
            size="lg"
            icon={<WhatsAppIcon />}
            className="mt-4"
          >
            Escribir por WhatsApp
          </Button>
          <p className="mt-3 text-body text-white/85">{WHATSAPP_NUMBER}</p>
        </div>

        <div>
          <h2 className="font-display text-h3 font-bold">Dónde estamos</h2>
          <p className="mt-2 text-body text-white/85">{ADDRESS}</p>
          <p className="mt-2 text-body text-white/85">Redes sociales: {SOCIAL_HANDLE}</p>
          <nav aria-label="Pie de página" className="mt-4">
            <ul className="space-y-1">
              {LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="focus-ring inline-flex min-h-btn items-center rounded-lg text-body font-semibold text-white underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-container px-4 py-5 text-body-sm text-white/85 md:px-8">
          © {new Date().getFullYear()} {CLUB_NAME} · Fusagasugá, Colombia
        </p>
      </div>
    </footer>
  );
}
