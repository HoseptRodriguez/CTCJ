import { useEffect, useState } from 'react';

import { billingClient } from '../../api/billingClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeBillingError } from '../../lib/billingErrorMessages.js';

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

function CreatePlanForm({ onCreated }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await billingClient.createPlan({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setCode('');
      setName('');
      setDescription('');
      await onCreated();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="plan-code">
          Código
        </label>
        <input
          id="plan-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="INICIACION"
          className="mt-1 w-40 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="plan-name">
          Nombre
        </label>
        <input
          id="plan-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Iniciación"
          className="mt-1 w-56 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="plan-description">
          Descripción (opcional)
        </label>
        <input
          id="plan-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-64 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={submitting || !code || !name}>
        {submitting ? 'Creando...' : 'Crear plan'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function PriceHistory({ planId }) {
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    billingClient
      .listPlanPrices(planId)
      .then((data) => {
        if (!cancelled) setPrices(data.prices);
      })
      .catch((err) => {
        if (!cancelled) setError(describeBillingError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (error) return <p className="text-sm text-error">{error}</p>;
  if (prices === null) return <p className="text-sm text-secondary">Cargando historial...</p>;
  if (prices.length === 0)
    return <p className="text-sm text-secondary">Sin precios registrados.</p>;

  return (
    <ul className="mt-2 space-y-1 text-sm text-secondary">
      {prices.map((p) => (
        <li key={p.id}>
          {COP_FORMATTER.format(p.basePriceCop)} · desde{' '}
          {DATE_FORMATTER.format(new Date(p.validFrom))}
          {p.validTo ? ` hasta ${DATE_FORMATTER.format(new Date(p.validTo))}` : ' · vigente'}
        </li>
      ))}
    </ul>
  );
}

function PlanCard({ plan, onPriceUpdated }) {
  const [basePriceCop, setBasePriceCop] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function handleSetPrice(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await billingClient.setPlanPrice(plan.id, {
        basePriceCop: Number(basePriceCop),
        validFrom,
      });
      setBasePriceCop('');
      setValidFrom('');
      setSaved(true);
      setShowHistory(false);
      await onPriceUpdated();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-primary">
            {plan.name} <span className="text-xs text-tertiary">({plan.code})</span>
          </p>
          <p className="text-sm text-secondary">
            {plan.currentPriceCop != null
              ? `Precio actual: ${COP_FORMATTER.format(plan.currentPriceCop)}`
              : 'Sin precio configurado'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Ocultar historial' : 'Ver historial de precios'}
        </Button>
      </div>

      {showHistory ? <PriceHistory planId={plan.id} /> : null}

      <form onSubmit={handleSetPrice} className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="sr-only" htmlFor={`price-${plan.id}`}>
            Nuevo precio
          </label>
          <input
            id={`price-${plan.id}`}
            type="number"
            min="0"
            step="1"
            required
            value={basePriceCop}
            onChange={(e) => setBasePriceCop(e.target.value)}
            placeholder="Pesos"
            className="w-32 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`valid-from-${plan.id}`}>
            Vigente desde
          </label>
          <input
            id={`valid-from-${plan.id}`}
            type="date"
            required
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Actualizar precio'}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-success">Precio actualizado.</p> : null}
    </li>
  );
}

export function PlansPage() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return billingClient
      .listPlans()
      .then((data) => setPlans(data.plans))
      .catch((err) => setError(describeBillingError(err)));
  }

  useEffect(() => {
    refetch();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Planes de membresía</h1>
      <p className="mt-1 text-secondary">
        Catálogo de planes y sus precios. Cambiar un precio nunca altera lo ya cobrado -- queda un
        historial completo.
      </p>

      <div className="mt-6">
        <CreatePlanForm onCreated={refetch} />
      </div>

      {error ? <p className="mt-6 text-error">{error}</p> : null}
      {!error && plans === null ? <p className="mt-6 text-secondary">Cargando...</p> : null}
      {plans?.length === 0 ? <p className="mt-6 text-secondary">Todavía no hay planes.</p> : null}

      {plans?.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onPriceUpdated={refetch} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
