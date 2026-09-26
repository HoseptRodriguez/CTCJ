import { BrochureTitle, DiagonalSection, toneText } from '../components/brochure/Brochure.jsx';
import { FacebookIcon } from '../components/icons/FacebookIcon.jsx';
import { InstagramIcon } from '../components/icons/InstagramIcon.jsx';
import { MapPinIcon } from '../components/icons/MapPinIcon.jsx';
import { TikTokIcon } from '../components/icons/TikTokIcon.jsx';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ClubLogo } from '../components/ui/ClubLogo.jsx';
import { ClubPhoto } from '../components/ui/ClubPhoto.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import {
  ADDRESS_FULL,
  MAPS_LINK,
  SOCIAL_HANDLE,
  SOCIAL_LINKS,
  WHATSAPP_LINK,
  WHATSAPP_NUMBER,
} from '../lib/clubInfo.js';
import { CLUB_TEXTS } from '../lib/clubTexts.js';

const SOCIAL_ICONS = { Instagram: InstagramIcon, Facebook: FacebookIcon, TikTok: TikTokIcon };

function Intro() {
  return (
    <section aria-labelledby="el-club-title" className="bg-navy-500 text-white">
      <div className="mx-auto max-w-container px-4 py-14 md:px-8 md:py-20">
        <p className="text-lead font-semibold text-lime">
          Club de Tenis Ciudad Jardín · Fusagasugá
        </p>
        <BrochureTitle
          as="h1"
          id="el-club-title"
          tone="navy"
          className="mt-3 text-[2.75rem] md:text-[4rem]"
        >
          El club
        </BrochureTitle>
        <p className="mt-6 max-w-prose text-lead text-white/90">
          Más de 10 años formando tenistas en la región, con la Academia Orlando Rodríguez.
        </p>
      </div>
    </section>
  );
}

function WhyUs() {
  return (
    <DiagonalSection photo="jugador-desplazamiento" tone="lime" titleId="por-que">
      <BrochureTitle id="por-que" tone="lime">
        Por qué elegirnos
      </BrochureTitle>
      <blockquote className="mt-6">
        <p className="text-lead text-navy-500">“{CLUB_TEXTS.why}”</p>
        <footer className="mt-4 font-display text-h3 font-bold text-navy-500">
          — Orlando Rodríguez
        </footer>
      </blockquote>
    </DiagonalSection>
  );
}

function MissionVision() {
  return (
    <section aria-label="Misión y visión" className="bg-navy-500 text-white">
      <div className="mx-auto grid max-w-container gap-12 px-4 py-14 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <BrochureTitle id="mision" tone="navy">
            Misión
          </BrochureTitle>
          <p className="mt-6 text-lead text-white/90">{CLUB_TEXTS.mission}</p>
        </div>
        <div>
          <BrochureTitle id="vision" tone="navy">
            Visión
          </BrochureTitle>
          <p className="mt-6 text-lead text-white/90">{CLUB_TEXTS.vision}</p>
        </div>
      </div>
    </section>
  );
}

function Spaces() {
  return (
    <DiagonalSection
      photo="canchas-panoramica-nubes"
      tone="lime"
      photoSide="right"
      titleId="espacios"
    >
      <BrochureTitle id="espacios" tone="lime">
        Nuestros espacios
      </BrochureTitle>
      <p className="mt-6 text-lead text-navy-500">{CLUB_TEXTS.spaces}</p>
    </DiagonalSection>
  );
}

function History() {
  return (
    <section aria-labelledby="historia" className="bg-surface">
      <div className="mx-auto grid max-w-container items-start gap-10 px-4 py-14 md:grid-cols-[2fr_3fr] md:px-8 md:py-20">
        <ClubPhoto
          name="academia-chaqueta-orlando-rodriguez"
          sizes="(min-width: 768px) 40vw, 100vw"
          className="aspect-[3/4] rounded-xl md:sticky md:top-28"
        />
        <div>
          <BrochureTitle id="historia">Nuestra historia</BrochureTitle>
          {CLUB_TEXTS.history.map((paragraph) => (
            <p key={paragraph.slice(0, 20)} className="mt-6 text-lead text-ink">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function FindUs() {
  return (
    <section aria-labelledby="donde" className="bg-page">
      <div className="mx-auto max-w-container px-4 py-14 md:px-8 md:py-20">
        <BrochureTitle id="donde">¿Dónde encontrarnos?</BrochureTitle>
        <p className="mt-6 max-w-prose text-lead text-ink">{ADDRESS_FULL}</p>
        <Button
          className="mt-8"
          size="lg"
          href={MAPS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          icon={<MapPinIcon />}
        >
          Cómo llegar
        </Button>
        <p className="mt-3 text-body text-ink-soft">Se abre Google Maps en otra pestaña.</p>
      </div>
    </section>
  );
}

function Contacts() {
  return (
    <section aria-labelledby="contactos" className="bg-navy-500 text-white">
      <div className="mx-auto grid max-w-container items-center gap-10 px-4 py-14 md:grid-cols-[1fr_auto] md:px-8 md:py-20">
        <div>
          <BrochureTitle id="contactos" tone="navy">
            Contactos
          </BrochureTitle>
          <Button
            className="mt-8"
            size="lg"
            tone="dark"
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            icon={<WhatsAppIcon />}
          >
            WhatsApp {WHATSAPP_NUMBER}
          </Button>
          <p className={`mt-8 text-lead ${toneText('navy')}`}>Síguenos como {SOCIAL_HANDLE}</p>
          <ul className="mt-3 flex flex-wrap gap-3" aria-label="Redes sociales">
            {SOCIAL_LINKS.map(({ network, url }) => {
              const Icon = SOCIAL_ICONS[network];
              return (
                <li key={network}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-btn items-center gap-2 rounded-lg border-2 border-white/80 px-4 text-body font-semibold text-white hover:bg-white/10"
                  >
                    <Icon className="h-5 w-5" />
                    {network}
                    <span className="sr-only"> (se abre en otra pestaña)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        {/* The full crest: its one appearance on this page. */}
        <ClubLogo size="xl" onDark className="justify-self-center" />
      </div>
    </section>
  );
}

/** /el-club -- the official brochure content. */
export function ClubPage() {
  useDocumentTitle('El club');
  return (
    <>
      <Intro />
      <WhyUs />
      <MissionVision />
      <Spaces />
      <History />
      <FindUs />
      <Contacts />
    </>
  );
}
