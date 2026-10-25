import { Link } from 'react-router-dom';

import { CalendarIcon } from '../components/icons/CalendarIcon.jsx';
import { TrendingUpIcon } from '../components/icons/TrendingUpIcon.jsx';
import { TrophyIcon } from '../components/icons/TrophyIcon.jsx';
import { UsersIcon } from '../components/icons/UsersIcon.jsx';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon.jsx';
import { CountUp } from '../components/motion/CountUp.jsx';
import { HeroBallTrajectory } from '../components/motion/HeroBallTrajectory.jsx';
import { ParallaxPhoto } from '../components/motion/ParallaxPhoto.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { SplitHeadline } from '../components/motion/SplitHeadline.jsx';
import {
  BrochureTitle,
  DiagonalDivider,
  DiagonalSection,
} from '../components/brochure/Brochure.jsx';
import { ProgramLinkCard } from '../components/brochure/ProgramLinkCard.jsx';
import { ExternalLinkMark } from '../components/forms/ExternalLinkMark.jsx';
import { InfoRequestForm } from '../components/forms/InfoRequestForm.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ADDRESS, MAPS_LINK, WHATSAPP_LINK, WHATSAPP_NUMBER } from '../lib/clubInfo.js';
import { CLUB_TEXTS } from '../lib/clubTexts.js';
import { PROGRAMS } from '../lib/programs.js';

import { FreeTodayCard } from './home/FreeTodayCard.jsx';
import { StickyReserveButton } from './home/StickyReserveButton.jsx';

const QUICK_ACTIONS = [
  {
    to: '/canchas',
    title: 'Reservar cancha',
    text: 'Elige el día y la hora. Pagas en recepción.',
    Icon: CalendarIcon,
  },
  {
    to: '/mi-ctcj/progreso',
    title: 'Mi progreso',
    text: 'Tus metas, tu rendimiento y las notas de tu entrenador.',
    Icon: TrendingUpIcon,
  },
  {
    to: '/mi-ctcj/ranking',
    title: 'Ranking del club',
    text: 'Tu posición, puntos y partidos de la temporada.',
    Icon: TrophyIcon,
  },
  {
    to: '/#clases',
    title: 'Clases y academia',
    text: 'Clases para adultos, escuela infantil y competencia.',
    Icon: UsersIcon,
  },
];

const HERO_ID = 'inicio';

/** Bento layout of the three program cards on the home page. */
const PROGRAM_LAYOUT = { adultos: 'md:row-span-2', 'escuela-infantil': '', competencia: '' };

export function HomePage() {
  useDocumentTitle('Inicio');
  return (
    <>
      <Hero />
      <DiagonalDivider from="bg-navy-500" to="bg-page" />
      <QuickActions />
      <DiagonalDivider from="bg-page" to="bg-surface" flip />
      <Programs />
      <DiagonalDivider from="bg-surface" to="bg-navy-500" />
      <AboutClub />
      <DiagonalDivider from="bg-navy-500" to="bg-page" flip />
      <RequestInfo />
      <StickyReserveButton heroId={HERO_ID} />
    </>
  );
}

function Hero() {
  return (
    <section
      id={HERO_ID}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-navy-500"
    >
      <div className="absolute inset-0 -z-20">
        <ParallaxPhoto
          name="canchas-panoramica-nubes"
          priority
          sizes="100vw"
          className="h-full w-full"
        />
      </div>
      {/* Navy veil strongest on the left, where the text sits. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-navy-500/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-navy-500 lg:via-navy-500/75 lg:to-transparent"
      />
      <div className="mx-auto grid min-h-[calc(100svh-84px)] max-w-container items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1fr_24rem]">
        <div className="max-w-2xl text-white">
          <p className="text-lead font-semibold text-lime">
            Club de Tenis Ciudad Jardín · Fusagasugá
          </p>
          <SplitHeadline
            id="hero-title"
            lines={['Arcilla, montaña', 'y un buen partido.']}
            className="mt-3 font-display text-title font-bold text-white md:text-title-lg lg:text-[4.5rem] lg:leading-[1.02]"
          />
          <p className="mt-5 max-w-prose text-lead text-white/90">
            Reserva tu cancha en línea, sigue tu progreso y entrena con la Academia Orlando
            Rodríguez.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button tone="dark" size="lg" to="/canchas" icon={<CalendarIcon />}>
              Reservar una cancha
            </Button>
            <Button tone="dark" size="lg" variant="secondary" to="/mi-ctcj">
              Entrar a Mi CTCJ
            </Button>
          </div>
          <HeroBallTrajectory tone="dark" className="mt-6 hidden max-w-md opacity-80 md:block" />
        </div>
        <FreeTodayCard />
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section id="que-hacer" aria-labelledby="que-hacer-title" className="bg-page">
      <div className="mx-auto max-w-container px-4 py-14 md:px-8">
        <h2
          id="que-hacer-title"
          className="font-display text-h2 font-bold text-ink md:text-[2.5rem]"
        >
          ¿Qué quieres hacer hoy?
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, title, text, Icon }, i) => (
            <Reveal as="li" key={title} index={i}>
              <Link
                to={to}
                className="focus-ring group flex h-full min-h-[11rem] flex-col rounded-xl border-2 border-line bg-surface p-6 shadow-sm transition-colors duration-fast hover:border-navy-500"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime text-navy-500">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="mt-4 font-display text-h3 font-bold text-ink">{title}</span>
                <span className="mt-1 text-body text-ink-soft">{text}</span>
                <span className="mt-auto pt-3 text-body font-semibold text-navy-500 group-hover:underline">
                  Ir ahora →
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Programs() {
  return (
    <section id="clases" aria-labelledby="clases-title" className="bg-surface">
      <div className="mx-auto max-w-container px-4 py-14 md:px-8">
        <h2 id="clases-title" className="font-display text-h2 font-bold text-ink md:text-[2.5rem]">
          Clases y academia
        </h2>
        <p className="mt-2 max-w-prose text-lead text-ink-soft">
          Academia Orlando Rodríguez: tenis para todas las edades y niveles.
        </p>
        <ul className="mt-8 grid auto-rows-[16rem] gap-4 md:grid-cols-2 md:auto-rows-[15rem]">
          {PROGRAMS.map((program, i) => (
            <Reveal as="li" key={program.slug} index={i} className={PROGRAM_LAYOUT[program.slug]}>
              <ProgramLinkCard program={program} className="h-full" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Brochure-style summary of the club -> /el-club, with its real figures. */
function AboutClub() {
  return (
    <DiagonalSection
      photo="academia-chaqueta-orlando-rodriguez"
      tone="navy"
      titleId="el-club-resumen"
      parallax
    >
      <Reveal>
        <BrochureTitle id="el-club-resumen" tone="navy">
          El club
        </BrochureTitle>
        <h3 className="mt-6 font-display text-h3 font-bold uppercase tracking-wide text-lime">
          Misión
        </h3>
        <p className="mt-2 text-lead text-white/90">{CLUB_TEXTS.mission}</p>
      </Reveal>
      <Reveal index={1}>
        <dl className="mt-8 grid grid-cols-2 gap-4">
          <div className="flex flex-col rounded-xl bg-white/10 p-4">
            <dt className="text-body text-white/90">canchas de arcilla</dt>
            <dd className="order-first font-display text-title font-bold text-lime">
              <CountUp value={3} />
            </dd>
          </div>
          <div className="flex flex-col rounded-xl bg-white/10 p-4">
            <dt className="text-body text-white/90">con iluminación</dt>
            <dd className="order-first font-display text-title font-bold text-lime">
              <CountUp value={2} />
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-lead text-white/90">
          Reservas en línea de 5:00 a. m. a 10:00 p. m.
        </p>
        <Button to="/el-club" tone="dark" size="lg" className="mt-8">
          Conoce el club
        </Button>
      </Reveal>
    </DiagonalSection>
  );
}

/** "Solicitar información" next to the direct contact (WhatsApp, address). */
function RequestInfo() {
  return (
    <section
      id="solicitar-informacion"
      aria-label="Solicitar información"
      className="scroll-mt-24 bg-page"
    >
      <div className="mx-auto grid max-w-container gap-8 px-4 pb-14 pt-6 md:px-8 lg:grid-cols-[1fr_22rem]">
        <InfoRequestForm />
        <aside aria-labelledby="contacto-directo" className="space-y-4 text-ink">
          <h2 id="contacto-directo" className="font-display text-h3 font-bold">
            ¿Prefieres escribirnos?
          </h2>
          <Button
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="lg"
            icon={<WhatsAppIcon />}
          >
            WhatsApp {WHATSAPP_NUMBER}
            <ExternalLinkMark />
          </Button>
          <p className="text-body">{ADDRESS}</p>
          <a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-block rounded font-semibold text-navy-500 underline underline-offset-4"
          >
            Cómo llegar
            <ExternalLinkMark />
          </a>
        </aside>
      </div>
    </section>
  );
}
