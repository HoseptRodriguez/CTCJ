import { Link } from 'react-router-dom';

import { CalendarIcon } from '../components/icons/CalendarIcon.jsx';
import { TrendingUpIcon } from '../components/icons/TrendingUpIcon.jsx';
import { TrophyIcon } from '../components/icons/TrophyIcon.jsx';
import { UsersIcon } from '../components/icons/UsersIcon.jsx';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon.jsx';
import { HeroBallTrajectory } from '../components/motion/HeroBallTrajectory.jsx';
import { ParallaxPhoto } from '../components/motion/ParallaxPhoto.jsx';
import { SplitHeadline } from '../components/motion/SplitHeadline.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ClubPhoto } from '../components/ui/ClubPhoto.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { WHATSAPP_LINK } from '../lib/clubInfo.js';

import { FreeTodayCard } from './home/FreeTodayCard.jsx';

const QUICK_ACTIONS = [
  {
    to: '/canchas',
    title: 'Reservar cancha',
    text: 'Elige el día y la hora. Pagas en recepción.',
    Icon: CalendarIcon,
  },
  {
    to: '/mi-ctcj?seccion=progreso',
    title: 'Mi progreso',
    text: 'Tus metas, tu rendimiento y las notas de tu entrenador.',
    Icon: TrendingUpIcon,
  },
  {
    to: '/mi-ctcj?seccion=ranking',
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

const PROGRAMS = [
  { photo: 'accion-desplazamiento', label: 'Clases para adultos', className: 'md:row-span-2' },
  { photo: 'accion-saque', label: 'Escuela infantil', className: '' },
  { photo: 'accion-palmeras', label: 'Competencia y ranking', className: '' },
];

export function HomePage() {
  useDocumentTitle('Inicio');
  return (
    <>
      <Hero />
      <QuickActions />
      <Programs />
      <ClayBlock />
    </>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-navy-500">
      <ClubPhoto
        name="hero-canchas"
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full"
      />
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
            Reserva tu cancha en un minuto, sigue tu progreso y entrena con la Academia Orlando
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
          {QUICK_ACTIONS.map(({ to, title, text, Icon }) => (
            <li key={title}>
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
            </li>
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
          {PROGRAMS.map(({ photo, label, className }) => (
            <li key={label} className={`relative overflow-hidden rounded-xl ${className}`}>
              <ClubPhoto
                name={photo}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="h-full w-full"
              />
              <span className="absolute bottom-4 left-4 rounded-lg bg-navy-500 px-4 py-2 font-display text-h3 font-bold text-white shadow-md">
                {label}
              </span>
            </li>
          ))}
        </ul>
        <Button
          className="mt-8"
          variant="secondary"
          size="lg"
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          icon={<WhatsAppIcon />}
        >
          Preguntar por clases
        </Button>
      </div>
    </section>
  );
}

function ClayBlock() {
  return (
    <section id="club" aria-labelledby="club-title" className="bg-clay text-white">
      <div className="mx-auto grid max-w-container items-center gap-8 px-4 py-14 md:grid-cols-2 md:px-8">
        <div>
          <h2
            id="club-title"
            className="font-display text-title font-bold leading-tight md:text-title-lg"
          >
            3 canchas de arcilla, abiertas todos los días
          </h2>
          <p className="mt-4 text-lead">De 5:00 a. m. a 10:00 p. m. Dos canchas con iluminación.</p>
          <Button tone="dark" size="lg" to="/canchas" icon={<CalendarIcon />} className="mt-8">
            Reservar una cancha
          </Button>
        </div>
        <ParallaxPhoto
          name="instalacion-red"
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-[4/3] rounded-xl"
        />
      </div>
    </section>
  );
}
