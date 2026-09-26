import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { bookingClient } from '../api/bookingClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { SlidePanel } from '../components/motion/SlidePanel.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { DAYS_SHOWN, HOLD_MINUTES } from '../lib/booking.js';
import { describeBookingError } from '../lib/bookingErrorMessages.js';
import {
  DAY_PARTS,
  HOURS,
  clubCurrentHour,
  clubTodayKey,
  dayPartForHour,
  slotEndIso,
  slotStartIso,
  upcomingDayKeys,
} from '../lib/clubTime.js';
import { useMediaQuery } from '../lib/useMediaQuery.js';

import { BookingPanel } from './reservation/BookingPanel.jsx';
import { CourtGrid, GridLegend } from './reservation/CourtGrid.jsx';
import { DayPicker } from './reservation/DayPicker.jsx';
import { StepIndicator } from './reservation/StepIndicator.jsx';

const STEPS = ['Elige el día', 'Toca una hora libre', `Confirma en ${HOLD_MINUTES} minutos`];
const IDLE = { status: 'idle', slot: null, hold: null, error: null };

function initialPart(dateKey) {
  if (dateKey !== clubTodayKey()) return 'manana';
  const hour = clubCurrentHour();
  return hour >= HOURS[HOURS.length - 1] ? 'noche' : dayPartForHour(Math.max(hour + 1, HOURS[0]));
}

export function ReservationPage() {
  useDocumentTitle('Reservar cancha');
  const { status: authStatus } = useAuth();
  const authenticated = authStatus === 'authenticated';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const wide = useMediaQuery('(min-width: 1024px)');

  const days = useMemo(() => upcomingDayKeys(DAYS_SHOWN), []);
  const requested = useMemo(() => readRequestedSlot(searchParams, days), [searchParams, days]);
  const [dateKey, setDateKey] = useState(requested?.dateKey ?? days[0]);
  const [part, setPart] = useState(() =>
    requested ? dayPartForHour(requested.hour) : initialPart(days[0]),
  );

  const [schedule, setSchedule] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [flow, setFlow] = useState(IDLE);
  const [minors, setMinors] = useState([]);
  const [holderUserId, setHolderUserId] = useState('');
  const preselectedFromUrl = useRef(false);

  // Day schedule (public; the server hides who booked what).
  useEffect(() => {
    let cancelled = false;
    setSchedule(null);
    setLoadError(false);
    bookingClient
      .getSchedule(dateKey)
      .then((data) => !cancelled && setSchedule(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [dateKey, reloadKey]);

  // Guardians can book for their approved minors. ?para=<minorUserId> (from
  // Mi CTCJ "Reservar para") preselects that minor once the list arrives.
  const requestedHolder = searchParams.get('para');
  useEffect(() => {
    if (!authenticated) {
      setMinors([]);
      return undefined;
    }
    let cancelled = false;
    guardianshipClient
      .listMine()
      .then((data) => {
        if (cancelled) return;
        const bookable = data.guardianships.filter((g) => g.status === 'APPROVED' && g.canBook);
        setMinors(bookable);
        if (requestedHolder && bookable.some((g) => g.minorUserId === requestedHolder)) {
          setHolderUserId(requestedHolder);
        }
      })
      .catch(() => {
        // Without the list, the person simply books for themselves.
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, requestedHolder]);

  const forLabel = holderUserId
    ? minors.find((m) => m.minorUserId === holderUserId)?.minorEmail
    : null;

  const buildSlot = useCallback(
    (court, hour, key = dateKey) => ({
      courtId: court.id,
      courtName: court.name,
      start: slotStartIso(key, hour),
      end: slotEndIso(key, hour),
      hour,
      dateKey: key,
      priceCop: court.priceCop,
      forLabel,
    }),
    [dateKey, forLabel],
  );

  // Arriving with ?fecha=&cancha=&hora= (home "Libre hoy", or back from
  // login): show that hour as chosen, and let the person confirm it.
  useEffect(() => {
    if (
      !requested ||
      !schedule ||
      preselectedFromUrl.current ||
      schedule.date !== requested.dateKey
    )
      return;
    const court = schedule.courts.find((c) => c.id === requested.courtId);
    preselectedFromUrl.current = true;
    if (court)
      setFlow({
        ...IDLE,
        status: 'preselected',
        slot: buildSlot(court, requested.hour, requested.dateKey),
      });
  }, [requested, schedule, buildSlot]);

  // The unconfirmed hold, if any -- released (cancelled on the server) when
  // the person picks another hour, changes day or leaves the page.
  const activeHold = useRef(null);
  const releaseHold = useCallback(() => {
    if (activeHold.current) {
      bookingClient.cancel(activeHold.current).catch(() => {});
      activeHold.current = null;
    }
  }, []);

  async function holdSlot(slot) {
    releaseHold();
    setFlow({ ...IDLE, status: 'holding', slot });
    try {
      const hold = await bookingClient.hold({
        courtId: slot.courtId,
        start: slot.start,
        end: slot.end,
        ...(holderUserId ? { holderUserId } : {}),
      });
      activeHold.current = hold.reservationId;
      setFlow({ ...IDLE, status: 'held', slot, hold });
    } catch (err) {
      setFlow({ ...IDLE, status: 'error', slot, error: describeBookingError(err) });
      setReloadKey((k) => k + 1);
    }
  }

  function goToLogin(slot) {
    navigate('/login', {
      state: {
        from: {
          pathname: '/canchas',
          search: `?fecha=${slot.dateKey}&cancha=${slot.courtId}&hora=${slot.hour}`,
        },
      },
    });
  }

  function handleSelect({ court, hour }) {
    const slot = buildSlot(court, hour);
    if (
      flow.slot &&
      flow.slot.start === slot.start &&
      flow.slot.courtId === slot.courtId &&
      flow.status !== 'error'
    ) {
      return; // already the chosen hour
    }
    if (!authenticated) {
      goToLogin(slot);
      return;
    }
    holdSlot(slot);
  }

  async function handleConfirm() {
    setFlow((f) => ({ ...f, status: 'confirming' }));
    try {
      await bookingClient.confirm({ reservationId: flow.hold.reservationId });
      activeHold.current = null;
      setFlow((f) => ({ ...f, status: 'confirmed' }));
      toast({
        title: 'Reserva confirmada',
        description: `${flow.slot.courtName}. Pagas en recepción al llegar.`,
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFlow((f) => ({ ...f, status: 'error', error: describeBookingError(err) }));
      setReloadKey((k) => k + 1);
    }
  }

  function chooseAnother() {
    releaseHold();
    setFlow(IDLE);
  }

  function handleExpire() {
    activeHold.current = null;
    setFlow((f) => (f.status === 'held' ? { ...f, status: 'expired' } : f));
    setReloadKey((k) => k + 1);
  }

  // Leaving the page with an unconfirmed hold frees the court right away.
  useEffect(() => releaseHold, [releaseHold]);

  function changeDay(key) {
    chooseAnother();
    setDateKey(key);
    setPart(initialPart(key));
  }

  const hours = DAY_PARTS.find((p) => p.value === part).hours;
  const step = flow.status === 'idle' ? 1 : flow.status === 'confirmed' ? 3 : 2;
  const selected =
    flow.slot && flow.status !== 'confirmed' && flow.slot.dateKey === dateKey ? flow.slot : null;

  const panel = (
    <BookingPanel
      flow={flow}
      authenticated={authenticated}
      showPhoto={wide}
      inPanel={!wide}
      onHoldPreselected={() => holdSlot({ ...flow.slot, forLabel })}
      onConfirm={handleConfirm}
      onChooseAnother={chooseAnother}
      onRetry={() => holdSlot(flow.slot)}
      onLogin={() => goToLogin(flow.slot)}
      onExpire={handleExpire}
    />
  );

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-editorial px-4 py-10 md:px-8">
        <PageHeader
          title="Reservar cancha"
          description="Así de fácil: eliges el día, tocas una hora libre y confirmas. Pagas en recepción."
        />
        <StepIndicator steps={STEPS} current={step} />

        {!authenticated && (
          <p className="mt-6 rounded-lg bg-navy-50 p-4 text-body text-ink">
            Puedes ver los horarios sin entrar. Para reservar te pediremos entrar con tu cuenta.
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-6">
            {minors.length > 0 && (
              <SegmentedControl
                label="Reservar para"
                value={holderUserId}
                onChange={(value) => {
                  chooseAnother();
                  setHolderUserId(value);
                }}
                options={[
                  { value: '', label: 'Yo' },
                  ...minors.map((m) => ({ value: m.minorUserId, label: m.minorEmail })),
                ]}
              />
            )}

            <section aria-labelledby="dia-title">
              <h2 id="dia-title" className="mb-3 font-display text-h3 font-bold text-ink">
                1. Elige el día
              </h2>
              <DayPicker days={days} value={dateKey} onChange={changeDay} />
            </section>

            <section
              aria-labelledby="hora-title"
              className="rounded-xl bg-surface p-4 shadow-sm md:p-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="hora-title" className="font-display text-h3 font-bold text-ink">
                  2. Toca una hora libre
                </h2>
                <SegmentedControl
                  className="w-full sm:w-auto"
                  fullWidth
                  label="Parte del día"
                  hideLabel
                  value={part}
                  onChange={setPart}
                  options={DAY_PARTS.map(({ value, label }) => ({ value, label }))}
                />
              </div>
              <div className="mt-4">
                <GridLegend />
              </div>
              <div className="mt-6">
                {loadError && (
                  <ErrorState
                    title="No pudimos cargar los horarios"
                    description="Revisa tu conexión a internet e intenta de nuevo."
                    onRetry={() => setReloadKey((k) => k + 1)}
                  />
                )}
                {!loadError && !schedule && (
                  <SkeletonGroup label="Cargando horarios…" className="space-y-2">
                    {hours.map((h) => (
                      <Skeleton key={h} className="h-16 w-full" />
                    ))}
                  </SkeletonGroup>
                )}
                {!loadError && schedule && (
                  <CourtGrid
                    schedule={schedule}
                    dateKey={dateKey}
                    hours={hours}
                    selected={selected}
                    onSelect={handleSelect}
                  />
                )}
              </div>
            </section>
          </div>

          {wide ? (
            <aside
              aria-label="Tu reserva"
              className="self-start rounded-xl bg-surface p-5 shadow-md lg:sticky lg:top-28"
            >
              {panel}
            </aside>
          ) : (
            <SlidePanel open={flow.status !== 'idle'} onClose={chooseAnother} title="Tu reserva">
              {panel}
            </SlidePanel>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reads ?fecha=YYYY-MM-DD&cancha=<id>&hora=<5..21>, only if it's a real, shown slot. */
function readRequestedSlot(searchParams, days) {
  const dateKey = searchParams.get('fecha');
  const courtId = searchParams.get('cancha');
  const hour = Number(searchParams.get('hora'));
  if (!dateKey || !courtId || !days.includes(dateKey) || !HOURS.includes(hour)) return null;
  return { dateKey, courtId, hour };
}
