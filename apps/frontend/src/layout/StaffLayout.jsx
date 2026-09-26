import { ROLE_CODES } from '@ctcj/shared';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { affiliationClient } from '../api/affiliationClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { communityAdminClient } from '../api/communityAdminClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { BarChartIcon } from '../components/icons/BarChartIcon.jsx';
import { CalendarIcon } from '../components/icons/CalendarIcon.jsx';
import { ClipboardIcon } from '../components/icons/ClipboardIcon.jsx';
import { HeartIcon } from '../components/icons/HeartIcon.jsx';
import { HomeIcon } from '../components/icons/HomeIcon.jsx';
import { LogOutIcon } from '../components/icons/LogOutIcon.jsx';
import { MoreIcon } from '../components/icons/MoreIcon.jsx';
import { NoteIcon } from '../components/icons/NoteIcon.jsx';
import { ShieldIcon } from '../components/icons/ShieldIcon.jsx';
import { TagIcon } from '../components/icons/TagIcon.jsx';
import { TrophyIcon } from '../components/icons/TrophyIcon.jsx';
import { UsersIcon } from '../components/icons/UsersIcon.jsx';
import { WalletIcon } from '../components/icons/WalletIcon.jsx';
import { SlidePanel } from '../components/motion/SlidePanel.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { ClubLogo } from '../components/ui/ClubLogo.jsx';
import { cn } from '../components/ui/cn.js';
import { FontSizeToggle } from '../components/ui/FontSizeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isUnpaid } from '../lib/booking.js';
import { clubTodayKey } from '../lib/clubTime.js';
import { splitForBottomBar, staffNavFor } from '../lib/staffNav.js';

import { NotificationBell } from './NotificationBell.jsx';
import { RouteLoading } from './RouteLoading.jsx';
import { StaffSearch } from './StaffSearch.jsx';

const ICONS = {
  home: HomeIcon,
  wallet: WalletIcon,
  calendar: CalendarIcon,
  heart: HeartIcon,
  users: UsersIcon,
  clipboard: ClipboardIcon,
  note: NoteIcon,
  trophy: TrophyIcon,
  chart: BarChartIcon,
  tag: TagIcon,
  shield: ShieldIcon,
};

/**
 * Pending counts for the amber badges, fetched only for the roles that may
 * see each page (the others would get 403s). Refreshed on every navigation
 * inside the console, so a count drops right after the work is done.
 */
function useStaffCounters(roles, pathname) {
  const [counts, setCounts] = useState({});
  const isAdmin = roles.includes(ROLE_CODES.ADMINISTRADOR);
  const isDesk = isAdmin || roles.includes(ROLE_CODES.RECEPCION);

  useEffect(() => {
    let cancelled = false;
    const jobs = [];
    if (isDesk) {
      jobs.push(
        bookingClient.getSchedule(clubTodayKey()).then((s) => ({
          unpaid: s.reservations.filter(isUnpaid).length,
        })),
        communityAdminClient.listReports().then((d) => ({ reports: d.reports.length })),
      );
    }
    if (isAdmin) {
      jobs.push(
        Promise.all([
          affiliationClient.listRequests(),
          guardianshipClient.listGuardianships(),
        ]).then(([a, g]) => ({
          requests: a.requests.length + g.guardianships.length,
        })),
      );
    }
    Promise.allSettled(jobs).then((results) => {
      if (cancelled) return;
      setCounts(
        Object.assign({}, ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value)),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isDesk, pathname]);

  return counts;
}

function Counter({ value, label }) {
  if (!value) return null;
  return (
    <span className="ml-auto flex h-7 min-w-7 items-center justify-center rounded-full bg-amber px-2 text-body-sm font-bold text-navy-500">
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function NavItem({ item, counts, onNavigate, compact = false, light = false }) {
  const Icon = ICONS[item.icon] ?? HomeIcon;
  return (
    <NavLink
      to={item.to}
      end={item.key === 'inicio'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'focus-ring flex min-h-btn items-center gap-3 rounded-lg px-3 text-body font-semibold',
          compact && 'min-h-btn-lg flex-col justify-center gap-1 px-1 text-body-sm',
          isActive
            ? 'bg-lime text-navy-500'
            : light
              ? 'text-navy-500 hover:bg-navy-50'
              : 'text-white hover:bg-white/10',
        )
      }
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className={compact ? 'text-center leading-tight' : undefined}>{item.label}</span>
      {!compact && <Counter value={counts[item.counter]} label="pendientes" />}
      {compact && counts[item.counter] ? (
        <span className="sr-only">{counts[item.counter]} pendientes</span>
      ) : null}
    </NavLink>
  );
}

function Sidebar({ groups, counts, onNavigate }) {
  return (
    <nav aria-label="Consola del club" className="space-y-6">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-2 px-3 text-body-sm font-bold uppercase tracking-eyebrow text-white/80">
            {group}
          </p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.key}>
                <NavItem item={item} counts={counts} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function StaffAvatar() {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    membershipClient
      .getMyProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);
  return (
    <span className="flex items-center gap-2">
      <Avatar
        src={profile?.avatarUrl}
        firstName={profile?.firstName}
        lastName={profile?.lastName}
        size="sm"
      />
      <span className="hidden text-body font-semibold text-ink xl:inline">
        {profile?.firstName ?? ''}
      </span>
    </span>
  );
}

export function StaffLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const roles = user?.roles ?? [];
  const groups = staffNavFor(roles);
  const counts = useStaffCounters(roles, location.pathname);
  const { primary, more } = splitForBottomBar(groups);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreCount = more.reduce((sum, item) => sum + (counts[item.counter] ?? 0), 0);

  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-page">
      <a
        href="#contenido"
        className="focus-ring sr-only z-toast rounded-lg bg-lime px-4 py-3 font-semibold text-navy-500 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      {/* Desktop: fixed 300px navy sidebar. */}
      <aside className="fixed inset-y-0 left-0 z-header hidden w-[300px] flex-col overflow-y-auto bg-navy-500 px-4 py-5 lg:flex">
        <Link
          to={groups[0]?.items[0]?.to ?? '/staff'}
          className="focus-ring mb-6 flex items-center gap-3 rounded-lg px-2"
        >
          <ClubLogo onDark decorative />
          <span className="font-display text-h3 font-bold leading-tight text-white">
            Consola
            <br />
            del club
          </span>
        </Link>
        <Sidebar groups={groups} counts={counts} />
        <div className="mt-auto space-y-1 border-t border-white/20 pt-4">
          <Link
            to="/"
            className="focus-ring flex min-h-btn items-center rounded-lg px-3 text-body font-semibold text-white hover:bg-white/10"
          >
            Ir al sitio del club
          </Link>
          <button
            type="button"
            onClick={logout}
            className="focus-ring flex min-h-btn w-full items-center gap-3 rounded-lg px-3 text-body font-semibold text-white hover:bg-white/10"
          >
            <LogOutIcon className="h-6 w-6" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-[300px]">
        <header className="sticky top-0 z-sticky border-b border-line bg-surface">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:px-8">
            <Link
              to={groups[0]?.items[0]?.to ?? '/staff'}
              className="focus-ring rounded-lg lg:hidden"
              aria-label="Inicio de la consola"
            >
              <ClubLogo decorative />
            </Link>
            {/* Phones: logo, bell and avatar on top; the search gets its own full-width row. */}
            <span aria-hidden="true" className="flex-1 md:hidden" />
            <div className="order-last w-full md:order-none md:w-auto md:min-w-0 md:flex-1">
              <StaffSearch roles={roles} />
            </div>
            <FontSizeToggle className="hidden md:inline-flex" />
            <NotificationBell />
            <StaffAvatar />
          </div>
        </header>

        <main id="contenido" className="mx-auto max-w-editorial px-4 pb-32 pt-8 md:px-8 lg:pb-12">
          <Suspense fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Phones: 4 main destinations + "Más". */}
      <nav
        aria-label="Consola, accesos principales"
        className="fixed inset-x-0 bottom-0 z-header border-t border-white/20 bg-navy-500 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5 gap-1 py-1">
          {primary.map((item) => (
            <li key={item.key} className="relative">
              <NavItem item={item} counts={counts} compact />
              {counts[item.counter] ? (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-1 h-3 w-3 rounded-full bg-amber ring-2 ring-navy-500"
                />
              ) : null}
            </li>
          ))}
          <li className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className="focus-ring flex min-h-btn-lg w-full flex-col items-center justify-center gap-1 rounded-lg text-body-sm font-semibold text-white hover:bg-white/10"
            >
              <MoreIcon className="h-6 w-6" />
              Más
              {moreCount > 0 && <span className="sr-only">, {moreCount} pendientes</span>}
            </button>
            {moreCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-1 h-3 w-3 rounded-full bg-amber ring-2 ring-navy-500"
              />
            )}
          </li>
        </ul>
      </nav>

      <SlidePanel open={moreOpen} onClose={() => setMoreOpen(false)} title="Más opciones">
        <ul className="space-y-1">
          {more.map((item) => (
            <li key={item.key}>
              <NavItem item={item} counts={counts} light onNavigate={() => setMoreOpen(false)} />
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-3 border-t border-line pt-4">
          <FontSizeToggle />
          <Link
            to="/"
            className="focus-ring flex min-h-btn items-center rounded-lg px-3 text-body font-semibold text-navy-500 hover:bg-navy-50"
          >
            Ir al sitio del club
          </Link>
          <button
            type="button"
            onClick={logout}
            className="focus-ring flex min-h-btn w-full items-center gap-3 rounded-lg px-3 text-body font-semibold text-navy-500 hover:bg-navy-50"
          >
            <LogOutIcon className="h-6 w-6" />
            Cerrar sesión
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
