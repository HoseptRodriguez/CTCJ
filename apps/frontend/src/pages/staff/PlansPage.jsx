import { PRICE_CHANGE_NOTICE_DAYS } from '@ctcj/shared';
import { useState } from 'react';

import { billingClient } from '../../api/billingClient.js';
import { PlusIcon } from '../../components/icons/PlusIcon.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeBillingError } from '../../lib/billingErrorMessages.js';
import { clubTodayKey } from '../../lib/clubTime.js';
import { formatCop } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_MEDIUM, SectionCard } from '../mictcj/shared.jsx';

import { FormAlert, StaffRow } from './staffShared.jsx';

// Price dates are date-only; read them at noon UTC so they never shift a day.
const dayKey = (value) => String(value).slice(0, 10);
const dateOnly = (value) => DATE_MEDIUM.format(new Date(`${dayKey(value)}T12:00:00Z`));
const CHANGED_AT = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});
const players = (n) => (n === 1 ? '1 jugador' : `${n} jugadores`);

const PRICE_STATE = {
  SCHEDULED: { status: 'pendiente', label: 'Programado' },
  CURRENT: { status: 'al-dia', label: 'Vigente' },
  PAST: { status: 'suspendida', label: 'Anterior' },
};

function NewPlanPanel({ open, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!name.trim()) return setError('Escribe el nombre del plan.');
    setSaving(true);
    setError(null);
    try {
      const plan = await billingClient.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast({
        title: 'Plan creado',
        description: `${plan.name ?? name.trim()}. Ahora ponle un precio con “Editar plan”.`,
        tone: 'success',
      });
      onCreated();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Nuevo plan"
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Creando plan…" onClick={save}>
          Crear plan
        </Button>
      }
    >
      <div className="space-y-6">
        <TextField
          label="Nombre del plan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          hint="Así lo ven los jugadores. Ejemplo: Iniciación. El código del plan se crea solo."
        />
        <TextAreaField
          label="Descripción (opcional)"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
        <FormAlert>{error}</FormAlert>
      </div>
    </SlidePanel>
  );
}

/** Name and description; the code is shown but never editable. */
function PlanDetailsSection({ plan, onChanged }) {
  const toast = useToast();
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const dirty = name.trim() !== plan.name || description.trim() !== (plan.description ?? '');

  async function save() {
    if (!name.trim()) return setError('Escribe el nombre del plan.');
    setSaving(true);
    setError(null);
    try {
      await billingClient.updatePlan(plan.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      toast({ title: 'Plan actualizado', description: name.trim(), tone: 'success' });
      onChanged();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="plan-datos" className="space-y-4">
      <h3 id="plan-datos" className="text-lead font-bold text-ink">
        Datos del plan
      </h3>
      <TextField
        label="Nombre del plan"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        maxLength={120}
      />
      <TextAreaField
        label="Descripción (opcional)"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
      />
      <p className="text-body text-ink-soft">
        Código: <strong className="text-ink">{plan.code}</strong> (se creó solo y no cambia)
      </p>
      <FormAlert>{error}</FormAlert>
      <Button
        variant="secondary"
        disabled={!dirty}
        loading={saving}
        loadingText="Guardando…"
        onClick={save}
      >
        Guardar cambios
      </Button>
    </section>
  );
}

/** Active plans are offered to new players; deactivating keeps the current ones. */
function PlanStatusSection({ plan, onChanged }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function toggle() {
    setSaving(true);
    try {
      await billingClient.setPlanActive(plan.id, !plan.isActive);
      toast({
        title: plan.isActive ? 'Plan desactivado' : 'Plan activado',
        description: plan.isActive
          ? `${plan.name} ya no se ofrece a jugadores nuevos.`
          : `${plan.name} se puede ofrecer de nuevo.`,
        tone: 'success',
      });
      onChanged();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <section aria-labelledby="plan-estado" className="space-y-4">
      <h3 id="plan-estado" className="text-lead font-bold text-ink">
        Estado
      </h3>
      <p className="text-body text-ink">
        {plan.isActive
          ? 'Activo: se ofrece a los jugadores nuevos.'
          : 'Desactivado: no se ofrece a jugadores nuevos. Los que ya lo tienen lo conservan.'}
      </p>
      <FormAlert>{error}</FormAlert>
      <Button variant="secondary" onClick={() => (plan.isActive ? setConfirming(true) : toggle())}>
        {plan.isActive ? 'Desactivar plan' : 'Activar plan'}
      </Button>
      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={`¿Desactivar ${plan.name}?`}
        description={`No se ofrecerá a jugadores nuevos. ${
          plan.activePlayers > 0
            ? `Los ${players(plan.activePlayers)} que ya lo tienen lo conservan, con su precio.`
            : 'Nadie lo tiene ahora.'
        }`}
        confirmLabel="Sí, desactivar"
        loading={saving}
        onConfirm={toggle}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}

function PriceSection({ plan, onChanged }) {
  const toast = useToast();
  const history = useAsync(
    () => billingClient.listPlanPrices(plan.id).then((d) => d.prices),
    [plan.id, plan.currentPriceCop, plan.scheduledPrice?.basePriceCop],
  );
  const isFirstPrice = plan.currentPriceCop == null && plan.scheduledPrice == null;
  const earliest = dayKey(plan.earliestPriceStart ?? clubTodayKey());
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState(earliest);
  const [confirming, setConfirming] = useState(null); // 'set' | 'cancel'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const price = Number(value);
  const tellsPlayers = !isFirstPrice && plan.activePlayers > 0;

  function review() {
    if (!value || !Number.isInteger(price) || price < 1)
      return setError('Escribe el precio en pesos, mayor que 0, sin puntos ni decimales.');
    if (price === Number(plan.currentPriceCop)) return setError('Es el mismo precio que ya tiene.');
    if (!validFrom) return setError('Elige desde cuándo aplica.');
    if (!isFirstPrice && validFrom < earliest)
      return setError(`El nuevo precio puede empezar desde el ${dateOnly(earliest)}.`);
    setError(null);
    setConfirming('set');
  }

  async function save() {
    setSaving(true);
    try {
      const result = await billingClient.setPlanPrice(plan.id, { basePriceCop: price, validFrom });
      toast({
        title: isFirstPrice ? 'Precio guardado' : 'Cambio de precio programado',
        description: `${plan.name}: ${formatCop(price)} desde el ${dateOnly(validFrom)}.${
          result.notifiedPlayers ? ` Avisamos a ${players(result.notifiedPlayers)}.` : ''
        }`,
        tone: 'success',
      });
      setValue('');
      onChanged();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  async function cancelScheduled() {
    setSaving(true);
    try {
      await billingClient.cancelScheduledPrice(plan.id);
      toast({
        title: 'Cambio de precio cancelado',
        description: `${plan.name} sigue en ${formatCop(plan.currentPriceCop)}.`,
        tone: 'success',
      });
      onChanged();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  return (
    <section aria-labelledby="plan-precio" className="space-y-4">
      <h3 id="plan-precio" className="text-lead font-bold text-ink">
        Precio
      </h3>
      <div className="rounded-xl bg-page p-5">
        <p className="text-body font-semibold text-ink-soft">Precio actual</p>
        <p className="font-display text-stat font-bold text-ink">
          {plan.currentPriceCop != null ? formatCop(plan.currentPriceCop) : 'Sin precio'}
        </p>
        <p className="text-body text-ink-soft">
          {plan.activePlayers > 0
            ? `${players(plan.activePlayers)} con este plan`
            : 'Nadie tiene este plan ahora'}
        </p>
      </div>

      {plan.scheduledPrice ? (
        <div className="space-y-3 rounded-xl border-2 border-status-pending-fg/30 bg-status-pending-bg p-5">
          <p className="text-body text-ink">
            <strong>Cambio programado:</strong> pasa a{' '}
            <strong>{formatCop(plan.scheduledPrice.basePriceCop)}</strong> desde el{' '}
            {dateOnly(plan.scheduledPrice.validFrom)}. Los jugadores ya recibieron el aviso.
          </p>
          <Button variant="secondary" onClick={() => setConfirming('cancel')}>
            Cancelar cambio programado
          </Button>
        </div>
      ) : (
        <>
          <TextField
            label={isFirstPrice ? 'Precio (en pesos)' : 'Nuevo precio (en pesos)'}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            hint={value ? `Quedaría en ${formatCop(price)}` : 'Sin puntos. Ejemplo: 180000'}
          />
          <TextField
            label="Aplica desde"
            type="date"
            min={isFirstPrice ? undefined : earliest}
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
          <div className="rounded-lg bg-navy-50 p-4 text-body text-ink">
            {tellsPlayers ? (
              <p>
                <strong>{players(plan.activePlayers)} tienen este plan.</strong> Les avisaremos hoy
                y el nuevo precio puede empezar desde el {dateOnly(earliest)} ({plan.noticeDays}{' '}
                días de aviso).
              </p>
            ) : (
              <p>Nadie tiene que recibir aviso: el precio puede empezar hoy.</p>
            )}
            <p className="mt-2">Las facturas ya emitidas no cambian.</p>
          </div>
          <FormAlert>{error}</FormAlert>
          <Button onClick={review}>{isFirstPrice ? 'Guardar precio' : 'Programar precio'}</Button>
        </>
      )}
      {plan.scheduledPrice && <FormAlert>{error}</FormAlert>}

      <div>
        <h4 className="mb-2 text-body font-bold text-ink">Historial de precios</h4>
        {history.status === 'loading' && (
          <p className="text-body text-ink-soft">Cargando historial…</p>
        )}
        {history.status === 'error' && (
          <p className="text-body text-ink">No pudimos cargar el historial.</p>
        )}
        {history.status === 'ready' &&
          (history.data.length === 0 ? (
            <p className="text-body text-ink-soft">Todavía no tiene precios.</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.data.map((p) => (
                <li key={p.id} className="space-y-1 py-3 text-body">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink">
                      {p.previousPriceCop != null ? `${formatCop(p.previousPriceCop)} → ` : ''}
                      {formatCop(p.basePriceCop)}
                    </span>
                    <StatusBadge {...(PRICE_STATE[p.state] ?? PRICE_STATE.PAST)} />
                  </div>
                  <p className="text-ink-soft">
                    Desde el {dateOnly(p.validFrom)}
                    {p.validTo ? ` hasta el ${dateOnly(p.validTo)}` : ''}
                  </p>
                  <p className="text-ink-soft">
                    Cambiado el {CHANGED_AT.format(new Date(p.createdAt))}
                    {p.changedByName ? ` por ${p.changedByName}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <ConfirmDialog
        open={confirming === 'set'}
        tone="primary"
        title={`¿${isFirstPrice ? 'Guardar el precio' : 'Cambiar el precio'} de ${plan.name}?`}
        description={`Quedará en ${formatCop(price)} desde el ${validFrom ? dateOnly(validFrom) : ''}.${
          tellsPlayers ? ` Avisaremos hoy a ${players(plan.activePlayers)}.` : ''
        } Las facturas ya emitidas no cambian.`}
        confirmLabel={isFirstPrice ? 'Sí, guardar precio' : 'Sí, cambiar precio'}
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === 'cancel'}
        tone="primary"
        title="¿Cancelar el cambio de precio?"
        description={`${plan.name} seguirá costando ${formatCop(plan.currentPriceCop)}. Los jugadores ya recibieron el aviso anterior; cuéntales que no habrá cambio.`}
        confirmLabel="Sí, cancelar cambio"
        loading={saving}
        onConfirm={cancelScheduled}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}

function EditPlanPanel({ plan, onClose, onChanged }) {
  return (
    <SlidePanel open={plan != null} onClose={onClose} title={plan ? `Editar ${plan.name}` : ''}>
      {plan && (
        <div className="space-y-10">
          <PlanDetailsSection key={`${plan.id}-${plan.name}`} plan={plan} onChanged={onChanged} />
          <PriceSection
            key={`${plan.id}-${plan.scheduledPrice?.validFrom ?? 'none'}-${plan.currentPriceCop}`}
            plan={plan}
            onChanged={onChanged}
          />
          <PlanStatusSection plan={plan} onChanged={onChanged} />
        </div>
      )}
    </SlidePanel>
  );
}

/** Days the players of a plan are told in advance of a new price. */
function NoticeDaysCard() {
  const toast = useToast();
  const notice = useAsync(() => billingClient.getPriceNoticeDays(), []);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const days = Number(value);

  async function save() {
    if (
      value === '' ||
      !Number.isInteger(days) ||
      days < PRICE_CHANGE_NOTICE_DAYS.MIN ||
      days > PRICE_CHANGE_NOTICE_DAYS.MAX
    ) {
      return setError(
        `Escribe un número de días entre ${PRICE_CHANGE_NOTICE_DAYS.MIN} y ${PRICE_CHANGE_NOTICE_DAYS.MAX}.`,
      );
    }
    setSaving(true);
    setError(null);
    try {
      const result = await billingClient.setPriceNoticeDays(days);
      notice.setData(() => result);
      setValue('');
      toast({
        title: 'Aviso actualizado',
        description: `Los cambios de precio se avisarán con ${result.days} días.`,
        tone: 'success',
      });
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Aviso de cambio de precio"
      description="Cuando cambias el precio de un plan que tiene jugadores, se les avisa y el precio nuevo empieza después de estos días."
      async={notice}
      className="mt-8"
    >
      {(d) => (
        <div className="space-y-4">
          <p className="text-lead text-ink">
            Ahora: <strong>{d.days} días</strong>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              label="Nuevo aviso (días)"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              hint="Aplica a los cambios que programes de ahora en adelante."
            />
            <Button loading={saving} loadingText="Guardando…" onClick={save}>
              Guardar aviso
            </Button>
          </div>
          <FormAlert>{error}</FormAlert>
        </div>
      )}
    </SectionCard>
  );
}

function planSubtitle(p) {
  if (p.currentPriceCop == null && !p.scheduledPrice)
    return 'Ponle un precio para poder inscribir jugadores.';
  const now = p.currentPriceCop != null ? `Precio: ${formatCop(p.currentPriceCop)}` : 'Sin precio';
  return p.scheduledPrice
    ? `${now} · Pasa a ${formatCop(p.scheduledPrice.basePriceCop)} el ${dateOnly(p.scheduledPrice.validFrom)}`
    : now;
}

export function PlansPage() {
  const plans = useAsync(() => billingClient.listPlans().then((d) => d.plans), []);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const editing = plans.data?.find((p) => p.id === editingId) ?? null;

  return (
    <div>
      <PageHeader
        title="Planes de membresía"
        description="Los planes que pagan los jugadores, sus precios y el historial de cambios. Los pagos se reciben en recepción."
        actions={
          <Button icon={<PlusIcon />} onClick={() => setCreating(true)}>
            Nuevo plan
          </Button>
        }
      />
      <SectionCard
        title="Planes"
        async={plans}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'Todavía no hay planes', description: 'Crea el primero con “Nuevo plan”.' }}
        errorTitle="No pudimos cargar los planes"
      >
        {(list) => (
          <ul className="space-y-3">
            {list.map((p) => (
              <li key={p.id}>
                <StaffRow
                  title={p.name}
                  badge={
                    !p.isActive ? (
                      <StatusBadge status="suspendida" label="Desactivado" />
                    ) : p.currentPriceCop == null && !p.scheduledPrice ? (
                      <StatusBadge status="pendiente" label="Sin precio" />
                    ) : p.scheduledPrice ? (
                      <StatusBadge status="pendiente" label="Cambio programado" />
                    ) : null
                  }
                  subtitle={planSubtitle(p)}
                  meta={`Código ${p.code} · ${players(p.activePlayers ?? 0)}${
                    p.description ? ` · ${p.description}` : ''
                  }`}
                  actions={
                    <Button
                      variant={p.currentPriceCop == null ? 'primary' : 'secondary'}
                      onClick={() => setEditingId(p.id)}
                    >
                      Editar plan
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <NoticeDaysCard />
      <NewPlanPanel
        key={creating ? 'new-open' : 'new-closed'}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          plans.reload();
        }}
      />
      <EditPlanPanel plan={editing} onClose={() => setEditingId(null)} onChanged={plans.reload} />
    </div>
  );
}
