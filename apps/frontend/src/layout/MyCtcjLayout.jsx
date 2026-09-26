import { Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { HomeIcon } from '../components/icons/HomeIcon.jsx';
import { CalendarIcon } from '../components/icons/CalendarIcon.jsx';
import { MessageIcon } from '../components/icons/MessageIcon.jsx';
import { TrendingUpIcon } from '../components/icons/TrendingUpIcon.jsx';
import { TrophyIcon } from '../components/icons/TrophyIcon.jsx';
import { ClubLogo } from '../components/ui/ClubLogo.jsx';
import { cn } from '../components/ui/cn.js';
import { FontSizeToggle } from '../components/ui/FontSizeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { MyCtcjProvider, useMyCtcj } from '../pages/mictcj/MyCtcjContext.jsx';

import { NotificationBell } from './NotificationBell.jsx';
import { RouteLoading } from './RouteLoading.jsx';

/** Tabs of the player area. The last three are for JUGADOR only. */
export const MY_CTCJ_TABS = [
  { to: '/mi-ctcj', end: true, label: 'Inicio', Icon: HomeIcon },
  { to: '/mi-ctcj/reservas', label: 'Reservas', Icon: CalendarIcon },
  { to: '/mi-ctcj/progreso', label: 'Mi progreso', Icon: TrendingUpIcon, jugadorOnly: true },
  { to: '/mi-ctcj/ranking', label: 'Ranking', Icon: TrophyIcon, jugadorOnly: true },
  { to: '/mi-ctcj/comunidad', label: 'Comunidad', Icon: MessageIcon, jugadorOnly: true },
];

export function MyCtcjLayout() {
  return (
    <MyCtcjProvider>
      <MyCtcjShell />
    </MyCtcjProvider>
  );
}

function Avatar({ profile }) {
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? '?';
  return profile?.avatarUrl ? (
    <img
      src={profile.avatarUrl}
      alt=""
      className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-lime font-display text-h3 font-bold text-navy-500"
    >
      {initial}
    </span>
  );
}

function MyCtcjShell() {
  const { logout } = useAuth();
  const { isJugador, profile } = useMyCtcj();
  const location = useLocation();
  const tabs = MY_CTCJ_TABS.filter((tab) => isJugador || !tab.jugadorOnly);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <a
        href="#contenido"
        className="focus-ring sr-only z-toast rounded-lg bg-lime px-4 py-3 font-semibold text-navy-500 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <header className="bg-navy-500 text-white">
        <div className="mx-auto flex max-w-container items-center justify-between gap-3 px-4 pb-2 pt-3 md:px-8">
          <Link
            to="/"
            className="focus-ring flex items-center gap-3 rounded-lg"
            aria-label="Club de Tenis Ciudad Jardín, sitio del club"
          >
            <ClubLogo onDark decorative />
            <span className="hidden font-display text-h3 font-bold sm:block">Mi CTCJ</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <FontSizeToggle tone="dark" className="hidden md:inline-flex" />
            <NotificationBell tone="dark" />
            <Link
              to="/mi-ctcj/perfil"
              className="focus-ring flex items-center gap-2 rounded-full pr-1"
              aria-label={profile?.firstName ? `Mi perfil (${profile.firstName})` : 'Mi perfil'}
            >
              <Avatar profile={profile} />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="focus-ring hidden min-h-btn rounded-lg border-2 border-white px-3 text-body font-semibold text-white hover:bg-white/10 sm:inline-flex sm:items-center"
            >
              Salir
            </button>
          </div>
        </div>
        <nav aria-label="Mi CTCJ" className="mx-auto max-w-container overflow-x-auto px-2 md:px-6">
          <ul className="flex min-w-max gap-1">
            {tabs.map(({ to, end, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring flex min-h-btn-lg items-center gap-2 rounded-t-xl border-b-4 px-4 text-body font-semibold',
                      isActive
                        ? 'border-lime bg-page text-navy-500'
                        : 'border-transparent text-white hover:bg-white/10',
                    )
                  }
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-container flex-1 px-4 py-8 md:px-8">
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-container flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <FontSizeToggle className="md:hidden" />
          <button
            type="button"
            onClick={logout}
            className="focus-ring min-h-btn rounded-lg px-3 text-body font-semibold text-navy-500 underline underline-offset-4 sm:hidden"
          >
            Salir de mi cuenta
          </button>
          <Link
            to="/"
            className="focus-ring inline-flex min-h-btn items-center rounded-lg text-body font-semibold text-navy-500 underline underline-offset-4"
          >
            Ir al sitio del club
          </Link>
        </div>
      </footer>
    </div>
  );
}
