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

// validFrom is a date-only key; read it at noon UTC so it never shifts a day.
const dateOnly = (key) => DATE_MEDIUM.format(new Date(`${String(key).slice(0, 10)}T12:00:00Z`));

function NewPlanPanel({ open, onClose, onCreated }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!name.trim() || !code.trim()) return setError('Escribe el nombre y el código del plan.');
    setSaving(true);
    setError(null);
    try {
      await billingClient.createPlan({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast({
        title: 'Plan creado',
        description: `${name.trim()}. Ahora ponle un precio.`,
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
          hint="Así lo ven los jugadores. Ejemplo: Iniciación"
        />
        <TextField
          label="Código"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={40}
          hint="Una palabra corta, sin espacios. Ejemplo: INICIACION. No se puede cambiar después."
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

function PricePanel({ plan, onClose, onSaved }) {
  const toast = useToast();
  const history = useAsync(
    () => billingClient.listPlanPrices(plan.id).then((d) => d.prices),
    [plan?.id],
    { enabled: plan != null },
  );
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState(clubTodayKey);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const price = Number(value);

  function review() {
    if (value === '' || !Number.isInteger(price))
      return setError('Escribe el precio en pesos, sin puntos ni decimales.');
    if (!validFrom) return setError('Elige desde cuándo aplica.');
    setError(null);
    setConfirming(true);
  }

  async function save() {
    setSaving(true);
    try {
      await billingClient.setPlanPrice(plan.id, { basePriceCop: price, validFrom });
      toast({
        title: 'Precio actualizado',
        description: `${plan.name}: ${formatCop(price)} desde el ${dateOnly(validFrom)}`,
        tone: 'success',
      });
      onSaved();
    } catch (err) {
      setConfirming(false);
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SlidePanel
        open={plan != null}
        onClose={onClose}
        title={plan ? `Precio de ${plan.name}` : ''}
        footer={
          <Button size="lg" fullWidth onClick={review}>
            Guardar precio
          </Button>
        }
      >
        {plan && (
          <div className="space-y-6">
            <div className="rounded-xl bg-page p-5">
              <p className="text-body font-semibold text-ink-soft">Precio actual</p>
              <p className="font-display text-stat font-bold text-ink">
                {plan.currentPriceCop != null ? formatCop(plan.currentPriceCop) : 'Sin precio'}
              </p>
            </div>
            <TextField
              label="Nuevo precio (en pesos)"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              hint={value ? `Quedaría en ${formatCop(price)}` : 'Ejemplo: 180000'}
            />
            <TextField
              label="Aplica desde"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
            <p className="rounded-lg bg-navy-50 p-4 text-body text-ink">
              Lo que ya se cobró no cambia. Queda guardado el historial de todos los precios.
            </p>
            <FormAlert>{error}</FormAlert>
            <div>
              <h3 className="mb-2 text-lead font-bold text-ink">Historial de precios</h3>
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
                      <li
                        key={p.id}
                        className="flex flex-wrap justify-between gap-2 py-2 text-body"
                      >
                        <span className="font-semibold text-ink">{formatCop(p.basePriceCop)}</span>
                        <span className="text-ink-soft">
                          desde el {dateOnly(p.validFrom)}
                          {p.validTo ? ` hasta el ${dateOnly(p.validTo)}` : ' · vigente'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        )}
      </SlidePanel>
      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={`¿Cambiar el precio de ${plan?.name ?? ''}?`}
        description={`Quedará en ${formatCop(price)} desde el ${validFrom ? dateOnly(validFrom) : ''}. Las facturas ya emitidas no cambian.`}
        confirmLabel="Sí, cambiar precio"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
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
        description="Los planes que pagan los jugadores y sus precios."
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
                    p.currentPriceCop == null ? (
                      <StatusBadge status="pendiente" label="Sin precio" />
                    ) : null
                  }
                  subtitle={
                    p.currentPriceCop != null
                      ? `Precio: ${formatCop(p.currentPriceCop)}`
                      : 'Ponle un precio para poder inscribir jugadores.'
                  }
                  meta={`Código ${p.code}${p.description ? ` · ${p.description}` : ''}`}
                  actions={
                    <Button
                      variant={p.currentPriceCop == null ? 'primary' : 'secondary'}
                      onClick={() => setEditingId(p.id)}
                    >
                      {p.currentPriceCop == null ? 'Poner precio' : 'Cambiar precio'}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <NewPlanPanel
        key={creating ? 'new-open' : 'new-closed'}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          plans.reload();
        }}
      />
      <PricePanel
        key={editingId ?? 'none'}
        plan={editing}
        onClose={() => setEditingId(null)}
        onSaved={() => {
          setEditingId(null);
          plans.reload();
        }}
      />
    </div>
  );
}
