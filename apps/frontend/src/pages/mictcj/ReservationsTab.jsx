import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { AnimatedList } from '../../components/motion/AnimatedList.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { capitalize, formatDayLong, formatTime } from '../../lib/format.js';

import {
  BookForSelector,
  CancelReservationButton,
  ReservationPayment,
  upcoming,
  useMyReservations,
} from './homeSections.jsx';
import { useMyCtcj } from './MyCtcjContext.jsx';
import { SectionCard } from './shared.jsx';

/** Mi CTCJ → Reservas: every upcoming own reservation, grouped by day. */
export function ReservationsTab() {
  useDocumentTitle('Mis reservas');
  const reservations = useMyReservations();
  const { bookableMinors } = useMyCtcj();

  function forWhom(r) {
    if (!r.bookedForOther) return null;
    return (
      bookableMinors.find((m) => m.minorUserId === r.holderUserId)?.minorEmail ?? 'otra persona'
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis reservas"
        description="Tus reservas de hoy y los próximos 7 días. Puedes cancelar sin penalidad hasta 12 horas antes."
        actions={
          <Button size="lg" to="/canchas" icon={<CalendarIcon />}>
            Reservar cancha
          </Button>
        }
        className="mb-0 md:mb-0"
      />
      <BookForSelector />
      <SectionCard
        title="Próximas reservas"
        async={reservations}
        isEmpty={(list) => upcoming(list).length === 0}
        empty={{
          title: 'No tienes reservas próximas',
          description:
            'Cuando reserves una cancha, aparecerá aquí con la fecha, la hora y si ya está pagada.',
          icon: <CalendarIcon />,
          action: (
            <Button to="/canchas" icon={<CalendarIcon />}>
              Reservar cancha
            </Button>
          ),
        }}
      >
        {(list) => (
          <AnimatedList
            aria-label="Próximas reservas"
            items={upcoming(list)}
            getKey={(r) => r.id}
            renderItem={(r) => (
              <article className="grid gap-4 rounded-xl border-2 border-line p-4 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                <div className="rounded-lg bg-clay px-3 py-2 text-center text-white">
                  <p className="text-body-sm font-semibold">
                    {capitalize(formatDayLong(r.periodStart).split(',')[0])}
                  </p>
                  <p className="font-display text-h2 font-bold leading-tight">
                    {formatTime(r.periodStart)}
                  </p>
                </div>
                <div>
                  <p className="font-display text-h3 font-bold text-ink">{r.courtName}</p>
                  <p className="text-body text-ink-soft">
                    {capitalize(formatDayLong(r.periodStart))}, {formatTime(r.periodStart)} a{' '}
                    {formatTime(r.periodEnd)}
                    {r.reservationType === 'CLASS' ? ' · Clase' : ''}
                  </p>
                  {forWhom(r) && (
                    <p className="text-body font-semibold text-ink">Reservada para {forWhom(r)}</p>
                  )}
                  <div className="mt-2">
                    <ReservationPayment reservation={r} />
                  </div>
                </div>
                <CancelReservationButton reservation={r} onCancelled={reservations.reload} />
              </article>
            )}
          />
        )}
      </SectionCard>
    </div>
  );
}
