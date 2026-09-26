import { useEffect, useRef, useState } from 'react';

import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { ClockIcon } from '../../components/icons/ClockIcon.jsx';
import { AnimatedCheck } from '../../components/motion/AnimatedCheck.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ClubPhoto } from '../../components/ui/ClubPhoto.jsx';
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton.jsx';
import { formatCountdown, secondsUntil } from '../../lib/booking.js';
import { capitalize, formatCop, formatDayLong, formatTime } from '../../lib/format.js';

/** Seconds left until `expiresAt`, ticking once per second; calls onExpire at 0. */
export function useCountdown(expiresAt, onExpire) {
  const [seconds, setSeconds] = useState(() => (expiresAt ? secondsUntil(expiresAt) : 0));
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt) return undefined;
    setSeconds(secondsUntil(expiresAt));
    const timer = setInterval(() => {
      const left = secondsUntil(expiresAt);
      setSeconds(left);
      if (left === 0) {
        clearInterval(timer);
        expireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return seconds;
}

function Summary({ slot }) {
  return (
    <dl className="space-y-3">
      <div>
        <dt className="text-body-sm font-semibold text-ink-soft">Cancha</dt>
        <dd className="font-display text-h2 font-bold text-ink">{slot.courtName}</dd>
      </div>
      <div>
        <dt className="text-body-sm font-semibold text-ink-soft">Día y hora</dt>
        <dd className="text-lead font-semibold text-ink">
          {capitalize(formatDayLong(slot.start))}
          <br />
          {formatTime(slot.start)} a {formatTime(slot.end)}
        </dd>
      </div>
      {slot.forLabel && (
        <div>
          <dt className="text-body-sm font-semibold text-ink-soft">Reserva para</dt>
          <dd className="text-body font-semibold text-ink">{slot.forLabel}</dd>
        </div>
      )}
    </dl>
  );
}

function Price({ amount }) {
  return (
    <div className="rounded-xl bg-page p-4">
      <p className="text-body-sm font-semibold text-ink-soft">Valor</p>
      <p className="font-display text-stat font-bold text-ink">{formatCop(amount)}</p>
      <p className="mt-1 text-body font-semibold text-ink">Pagas en recepción al llegar.</p>
      <p className="mt-1 text-body-sm text-ink-soft">Pago en línea — Próximamente.</p>
    </div>
  );
}

function Countdown({ expiresAt, onExpire }) {
  const seconds = useCountdown(expiresAt, onExpire);
  const minutesLeft = Math.ceil(seconds / 60);
  const urgent = seconds <= 60;
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border-2 p-4 ${urgent ? 'border-danger bg-danger-soft' : 'border-amber bg-amber-soft'}`}
    >
      <ClockIcon className="h-8 w-8 shrink-0 text-ink" />
      <div>
        <p aria-hidden="true" className="font-display text-stat font-bold tabular-nums text-ink">
          {formatCountdown(seconds)}
        </p>
        <p className="text-body font-semibold text-ink">
          para confirmar. Después la hora se libera.
        </p>
        {/* Screen readers hear minute steps only, not every second. */}
        <p className="sr-only" aria-live="polite">
          {urgent
            ? 'Te queda menos de 1 minuto para confirmar.'
            : `Te quedan ${minutesLeft} minutos para confirmar.`}
        </p>
      </div>
    </div>
  );
}

/**
 * Right-hand panel of the booking page (a slide-in panel on phones).
 * `flow.status`: idle | preselected | holding | held | confirming |
 * confirmed | expired | error.
 */
export function BookingPanel({
  flow,
  authenticated,
  onHoldPreselected,
  onConfirm,
  onChooseAnother,
  onRetry,
  onLogin,
  onExpire,
  showPhoto = true,
  inPanel = false,
  holdMinutes,
}) {
  const { status, slot, hold, error } = flow;

  if (status === 'idle') {
    return (
      <div>
        {showPhoto && (
          <ClubPhoto
            name="canchas-panoramica-nubes"
            alt=""
            sizes="22rem"
            className="aspect-[16/9] rounded-xl"
          />
        )}
        {!inPanel && <h2 className="mt-5 font-display text-h2 font-bold text-ink">Tu reserva</h2>}
        <p className="mt-2 text-body text-ink-soft">
          Elige el día y toca una hora <strong className="text-ink">Libre</strong>. Te la guardamos
          {holdMinutes ? `${holdMinutes} minutos` : 'unos minutos'} mientras confirmas.
        </p>
        <p className="mt-4 text-body text-ink-soft">
          Las reservas son de 1 hora. Pagas en recepción al llegar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showPhoto && (
        <ClubPhoto
          name="canchas-panoramica-nubes"
          alt=""
          sizes="22rem"
          className="aspect-[16/9] rounded-xl"
        />
      )}
      {(!inPanel || status === 'confirmed') && (
        <h2 className="font-display text-h2 font-bold text-ink">
          {status === 'confirmed' ? 'Reserva confirmada' : 'Tu reserva'}
        </h2>
      )}

      {status === 'confirmed' && (
        <div className="flex items-center gap-4">
          <AnimatedCheck label="Reserva confirmada" />
          <p className="text-lead font-semibold text-ink">¡Listo! Te esperamos en el club.</p>
        </div>
      )}

      <Summary slot={slot} />

      {status === 'preselected' && (
        <>
          <Price amount={slot.priceCop} />
          {authenticated ? (
            <Button size="lg" fullWidth icon={<CalendarIcon />} onClick={onHoldPreselected}>
              Reservar esta hora
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={onLogin}>
              Entrar para reservar
            </Button>
          )}
          <Button variant="secondary" fullWidth onClick={onChooseAnother}>
            Elegir otra hora
          </Button>
        </>
      )}

      {status === 'holding' && (
        <SkeletonGroup label="Apartando la hora…" className="space-y-3">
          <p className="text-body font-semibold text-ink">Apartando la hora…</p>
          <Skeleton className="h-24 w-full" />
        </SkeletonGroup>
      )}

      {(status === 'held' || status === 'confirming') && (
        <>
          <Countdown expiresAt={hold.holdExpiresAt} onExpire={onExpire} />
          <Price amount={hold.priceCop} />
          <Button
            size="lg"
            fullWidth
            icon={<CheckIcon />}
            onClick={onConfirm}
            loading={status === 'confirming'}
            loadingText="Confirmando…"
          >
            Confirmar reserva
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={onChooseAnother}
            disabled={status === 'confirming'}
          >
            Elegir otra hora
          </Button>
        </>
      )}

      {status === 'confirmed' && (
        <>
          <Price amount={hold.priceCop} />
          <Button size="lg" fullWidth to="/mi-ctcj">
            Ver mis reservas
          </Button>
          <Button variant="secondary" fullWidth onClick={onChooseAnother}>
            Reservar otra hora
          </Button>
        </>
      )}

      {status === 'expired' && (
        <>
          <p
            role="alert"
            className="rounded-lg border-2 border-danger bg-danger-soft p-4 text-body text-ink"
          >
            Se acabó el tiempo para confirmar y la hora quedó libre. Puedes intentarlo de nuevo.
          </p>
          <Button size="lg" fullWidth onClick={onRetry}>
            Intentar de nuevo
          </Button>
          <Button variant="secondary" fullWidth onClick={onChooseAnother}>
            Elegir otra hora
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <p
            role="alert"
            className="rounded-lg border-2 border-danger bg-danger-soft p-4 text-body text-ink"
          >
            {error}
          </p>
          <Button variant="secondary" size="lg" fullWidth onClick={onChooseAnother}>
            Elegir otra hora
          </Button>
        </>
      )}
    </div>
  );
}
