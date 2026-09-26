import { MAX_HOLD_DURATION_MINUTES, MIN_HOLD_DURATION_MINUTES } from '@ctcj/shared';
import { useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import { formatCop } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { SectionCard } from '../mictcj/shared.jsx';

import { FormAlert, StaffRow } from './staffShared.jsx';

function PricePanel({ court, onClose, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(court?.priceCop != null ? String(court.priceCop) : '');
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const price = Number(value);

  function review() {
    if (!value || !Number.isInteger(price) || price < 1)
      return setError('Escribe el precio en pesos, sin puntos ni decimales.');
    if (price === court.priceCop) return setError('Es el mismo precio que ya tiene.');
    setError(null);
    setConfirming(true);
  }

  async function save() {
    setSaving(true);
    try {
      const result = await bookingClient.setCourtPrice(court.id, price);
      toast({
        title: 'Precio actualizado',
        description: `${court.name}: ${formatCop(result.priceCop)} por hora`,
        tone: 'success',
      });
      onSaved(court.id, result.priceCop);
    } catch (err) {
      setConfirming(false);
      setError(describeBookingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SlidePanel
        open={court != null}
        onClose={onClose}
        title={court ? `Precio de ${court.name}` : ''}
        footer={
          <Button size="lg" fullWidth onClick={review}>
            Guardar precio
          </Button>
        }
      >
        {court && (
          <div className="space-y-6">
            <div className="rounded-xl bg-page p-5">
              <p className="text-body font-semibold text-ink-soft">Precio actual por hora</p>
              <p className="font-display text-stat font-bold text-ink">
                {court.priceCop != null ? formatCop(court.priceCop) : 'Sin precio'}
              </p>
            </div>
            <TextField
              label="Nuevo precio por hora (en pesos)"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              hint={value ? `Quedaría en ${formatCop(price)}` : 'Ejemplo: 35000'}
            />
            <p className="rounded-lg bg-navy-50 p-4 text-body text-ink">
              Las reservas ya hechas conservan el precio con el que se reservaron. El nuevo precio
              aplica a las reservas nuevas.
            </p>
            <FormAlert>{error}</FormAlert>
          </div>
        )}
      </SlidePanel>
      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={`¿Cambiar el precio de ${court?.name ?? ''}?`}
        description={`Pasa de ${court?.priceCop != null ? formatCop(court.priceCop) : 'sin precio'} a ${formatCop(price)} por hora para las reservas nuevas.`}
        confirmLabel="Sí, cambiar precio"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** Admin setting: minutes a player has to confirm a held hour. */
function HoldDurationCard() {
  const toast = useToast();
  const policy = useAsync(() => bookingClient.getHoldDuration(), []);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const minutes = Number(value);

  function review() {
    if (
      !Number.isInteger(minutes) ||
      minutes < MIN_HOLD_DURATION_MINUTES ||
      minutes > MAX_HOLD_DURATION_MINUTES
    ) {
      return setError(
        `Escribe un número de minutos entre ${MIN_HOLD_DURATION_MINUTES} y ${MAX_HOLD_DURATION_MINUTES}.`,
      );
    }
    if (minutes === policy.data?.minutes)
      return setError('Es el mismo tiempo que ya está configurado.');
    setError(null);
    setConfirming(true);
  }

  async function save() {
    setSaving(true);
    try {
      const result = await bookingClient.setHoldDuration(minutes);
      policy.setData(() => result);
      setValue('');
      toast({
        title: 'Tiempo actualizado',
        description: `Las reservas nuevas se guardan ${result.minutes} minutos.`,
        tone: 'success',
      });
    } catch (err) {
      setError(describeBookingError(err));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <SectionCard
      title="Tiempo para confirmar una reserva"
      description="Cuando alguien toca una hora libre, se la guardamos este tiempo mientras confirma. Si no confirma, la hora vuelve a quedar libre."
      async={policy}
      className="mt-8"
    >
      {(d) => (
        <div className="space-y-4">
          <p className="text-lead text-ink">
            Ahora: <strong>{d.minutes} minutos</strong>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              label="Nuevo tiempo (minutos)"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              hint={`Entre ${MIN_HOLD_DURATION_MINUTES} y ${MAX_HOLD_DURATION_MINUTES} minutos.`}
            />
            <Button onClick={review}>Guardar tiempo</Button>
          </div>
          <FormAlert>{error}</FormAlert>
          <ConfirmDialog
            open={confirming}
            tone="primary"
            title="¿Cambiar el tiempo para confirmar?"
            description={`Pasa de ${d.minutes} a ${minutes} minutos. Aplica a las reservas nuevas; las que ya están en espera conservan su tiempo.`}
            confirmLabel="Sí, cambiar tiempo"
            loading={saving}
            onConfirm={save}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}
    </SectionCard>
  );
}

export function CourtPricingPage() {
  const courts = useAsync(() => bookingClient.listCourts().then((d) => d.courts), []);
  const [editingId, setEditingId] = useState(null);
  const editing = courts.data?.find((c) => c.id === editingId) ?? null;

  return (
    <div>
      <PageHeader
        title="Precios de canchas"
        description="El precio queda fijo en cada reserva al confirmarla, aunque después cambies el precio de la cancha."
      />
      <SectionCard
        title="Canchas"
        async={courts}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'No hay canchas activas' }}
        errorTitle="No pudimos cargar las canchas"
      >
        {(list) => (
          <ul className="space-y-3">
            {list.map((c) => (
              <li key={c.id}>
                <StaffRow
                  title={c.name}
                  subtitle={c.priceCop != null ? `${formatCop(c.priceCop)} por hora` : undefined}
                  badge={
                    c.priceCop == null ? (
                      <StatusBadge status="pendiente" label="Sin precio" />
                    ) : null
                  }
                  meta={
                    c.priceCop == null ? 'No se puede cobrar hasta que tenga precio.' : undefined
                  }
                  actions={
                    <Button
                      variant={c.priceCop == null ? 'primary' : 'secondary'}
                      onClick={() => setEditingId(c.id)}
                    >
                      {c.priceCop == null ? 'Poner precio' : 'Cambiar precio'}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <HoldDurationCard />
      <PricePanel
        key={editingId ?? 'none'}
        court={editing}
        onClose={() => setEditingId(null)}
        onSaved={(id, priceCop) => {
          courts.setData((list) => list.map((c) => (c.id === id ? { ...c, priceCop } : c)));
          setEditingId(null);
        }}
      />
    </div>
  );
}
