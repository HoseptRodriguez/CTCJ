import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { capitalize, formatDayLong } from '../../lib/format.js';

import {
  AffiliationBlock,
  BookForSelector,
  ChallengesCard,
  CoachSaysCard,
  GoalsCard,
  MembershipCard,
  NextMatchCard,
  PerformanceCard,
  RankingCard,
  useMyReservations,
} from './homeSections.jsx';
import { useMyCtcj } from './MyCtcjContext.jsx';
import { MembershipBadge } from './shared.jsx';

/** Mi CTCJ → Inicio. */
export function HomeTab() {
  useDocumentTitle('Mi CTCJ');
  const { isJugador, profile, membershipStatus } = useMyCtcj();
  const reservations = useMyReservations();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-body font-semibold text-ink-soft">
            {capitalize(formatDayLong(new Date()))}
          </p>
          <h1 className="font-display text-title font-bold text-ink md:text-title-lg">
            {profile?.firstName ? `Hola, ${profile.firstName}` : 'Hola'}
          </h1>
          {isJugador && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-body text-ink-soft">Tu membresía:</span>
              <MembershipBadge status={membershipStatus} />
            </div>
          )}
        </div>
        <Button size="lg" to="/canchas" icon={<CalendarIcon />}>
          Reservar cancha
        </Button>
      </header>

      <BookForSelector />

      {isJugador ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <NextMatchCard reservations={reservations} />
            <RankingCard />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <ChallengesCard />
            <GoalsCard />
            <CoachSaysCard />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <PerformanceCard />
            <MembershipCard />
          </div>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <NextMatchCard reservations={reservations} />
          <AffiliationBlock />
        </div>
      )}
    </div>
  );
}
