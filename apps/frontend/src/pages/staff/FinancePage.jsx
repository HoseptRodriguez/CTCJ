import { lazy, Suspense, useState } from 'react';

import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { DownloadIcon } from '../../components/icons/DownloadIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { addDaysToKey, clubTodayKey } from '../../lib/clubTime.js';
import { exportToCsv } from '../../lib/csvExport.js';
import { formatCop } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_MEDIUM, SectionCard } from '../mictcj/shared.jsx';

import { METHOD_LABELS } from './staffShared.jsx';

// recharts stays in its own chunk, loaded only when this page renders.
const CashFlowChart = lazy(() =>
  import('../../components/ui/CashFlowChart.jsx').then((m) => ({ default: m.CashFlowChart })),
);

const pad = (n) => String(n).padStart(2, '0');

function monthRange(offset = 0) {
  const [y, m] = clubTodayKey().split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const key = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { from: key(first), to: key(last) };
}

const PRESETS = {
  'este-mes': () => monthRange(0),
  'mes-pasado': () => monthRange(-1),
  '30-dias': () => ({ from: addDaysToKey(clubTodayKey(), -29), to: clubTodayKey() }),
};

const fullName = (i) =>
  [i.playerFirstName, i.playerLastName].filter(Boolean).join(' ') || 'Jugador sin nombre';
const dateOnly = (iso) => DATE_MEDIUM.format(new Date(iso));

function CsvButton({ onClick }) {
  return (
    <Button variant="secondary" icon={<DownloadIcon />} onClick={onClick}>
      Descargar CSV
    </Button>
  );
}

function Row({ left, sub, right, badge }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{left}</p>
        {sub && <p className="text-body-sm text-ink-soft">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        {badge}
        <p className="font-display text-h3 font-bold text-ink">{right}</p>
      </div>
    </li>
  );
}

function RangePicker({ preset, range, onPreset, onRange }) {
  return (
    <div className="mb-8 space-y-4">
      <SegmentedControl
        label="Período"
        value={preset}
        onChange={onPreset}
        options={[
          { value: 'este-mes', label: 'Este mes' },
          { value: 'mes-pasado', label: 'Mes pasado' },
          { value: '30-dias', label: 'Últimos 30 días' },
          { value: 'otro', label: 'Otras fechas' },
        ]}
      />
      {preset === 'otro' && (
        <div className="grid max-w-lg grid-cols-2 gap-4">
          <TextField
            label="Desde"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => e.target.value && onRange({ ...range, from: e.target.value })}
          />
          <TextField
            label="Hasta"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => e.target.value && onRange({ ...range, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function CashFlowSection() {
  const [months, setMonths] = useState('6');
  const flow = useAsync(
    () =>
      Promise.all([
        bookingClient.getMonthlyRevenue({ months: Number(months) }),
        billingClient.getMonthlyRevenue({ months: Number(months) }),
      ]).then(([court, membership]) => {
        const byMonth = new Map(membership.months.map((m) => [m.month, m.totalCop]));
        return court.months.map((m) => ({
          month: m.month,
          courtCop: m.totalCop,
          membershipCop: byMonth.get(m.month) ?? 0,
        }));
      }),
    [months],
  );

  return (
    <SectionCard
      title="Flujo de caja"
      description="Lo que entró cada mes, por canchas y por membresías."
      className="mb-8"
      async={flow}
      isEmpty={(d) => d.length === 0}
      empty={{ title: 'Todavía no hay ingresos registrados' }}
      actions={
        <>
          <SegmentedControl
            label="Meses"
            hideLabel
            value={months}
            onChange={setMonths}
            options={[
              { value: '3', label: '3 meses' },
              { value: '6', label: '6 meses' },
              { value: '12', label: '12 meses' },
            ]}
          />
          {flow.status === 'ready' && (
            <CsvButton
              onClick={() =>
                exportToCsv({
                  filename: `flujo-de-caja-${months}-meses.csv`,
                  columns: [
                    { header: 'Mes', get: (m) => m.month },
                    { header: 'Canchas', get: (m) => m.courtCop },
                    { header: 'Membresías', get: (m) => m.membershipCop },
                    { header: 'Total', get: (m) => m.courtCop + m.membershipCop },
                  ],
                  rows: flow.data,
                })
              }
            />
          )}
        </>
      }
    >
      {(data) => (
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <CashFlowChart months={data} />
        </Suspense>
      )}
    </SectionCard>
  );
}

export function FinancePage() {
  const [preset, setPreset] = useState('este-mes');
  const [range, setRange] = useState(PRESETS['este-mes']);

  const court = useAsync(() => bookingClient.listPayments(range), [range.from, range.to]);
  const membership = useAsync(
    () => billingClient.listInvoicesClubWide({ status: 'PAID', from: range.from, to: range.to }),
    [range.from, range.to],
  );
  const cartera = useAsync(() => billingClient.listInvoicesClubWide({ status: 'PENDING' }), []);

  const bothReady = court.status === 'ready' && membership.status === 'ready';
  const total = bothReady ? Number(court.data.totalCop) + Number(membership.data.totalCop) : null;

  function choosePreset(value) {
    setPreset(value);
    if (PRESETS[value]) setRange(PRESETS[value]());
  }

  return (
    <div>
      <PageHeader
        title="Finanzas"
        description="Ingresos del club, flujo de caja y cartera pendiente."
      />

      <RangePicker preset={preset} range={range} onPreset={choosePreset} onRange={setRange} />

      <section
        aria-label="Total del período"
        className="mb-8 rounded-xl bg-navy-500 p-6 text-white md:p-8"
      >
        <p className="text-lead text-white/90">
          Ingresos del {dateOnly(`${range.from}T12:00:00Z`)} al {dateOnly(`${range.to}T12:00:00Z`)}
        </p>
        {total != null ? (
          <p className="mt-2 font-display text-[3.5rem] font-bold leading-none md:text-[4.5rem]">
            {formatCop(total)}
          </p>
        ) : court.status === 'error' || membership.status === 'error' ? (
          <p className="mt-2 text-lead font-semibold">
            No pudimos calcular el total. Revisa las secciones de abajo.
          </p>
        ) : (
          <Skeleton className="mt-3 h-16 w-72 bg-white/20" />
        )}
        {bothReady && (
          <p className="mt-3 text-lead text-white/90">
            Canchas {formatCop(court.data.totalCop)} · Membresías{' '}
            {formatCop(membership.data.totalCop)}
          </p>
        )}
      </section>

      <CashFlowSection />

      <div className="grid gap-8 xl:grid-cols-2">
        <SectionCard
          title="Pagos de canchas"
          description={
            court.status === 'ready'
              ? `${court.data.count} pagos · ${formatCop(court.data.totalCop)}`
              : undefined
          }
          async={court}
          isEmpty={(d) => d.payments.length === 0}
          empty={{ title: 'Sin pagos de canchas en este período' }}
          actions={
            court.status === 'ready' && court.data.payments.length > 0 ? (
              <CsvButton
                onClick={() =>
                  exportToCsv({
                    filename: `pagos-canchas-${range.from}-a-${range.to}.csv`,
                    columns: [
                      { header: 'Fecha', get: (p) => new Date(p.recordedAt).toISOString() },
                      { header: 'Método', get: (p) => METHOD_LABELS[p.method] ?? p.method },
                      { header: 'Monto', get: (p) => p.amountCop },
                    ],
                    rows: court.data.payments,
                  })
                }
              />
            ) : null
          }
        >
          {(d) => (
            <ul className="divide-y divide-line">
              {d.payments.map((p) => (
                <Row
                  key={p.id}
                  left={dateOnly(p.recordedAt)}
                  sub={METHOD_LABELS[p.method] ?? p.method}
                  right={formatCop(p.amountCop)}
                />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Pagos de membresías"
          description={
            membership.status === 'ready'
              ? `${membership.data.count} pagos · ${formatCop(membership.data.totalCop)}`
              : undefined
          }
          async={membership}
          isEmpty={(d) => d.invoices.length === 0}
          empty={{ title: 'Sin pagos de membresías en este período' }}
          actions={
            membership.status === 'ready' && membership.data.invoices.length > 0 ? (
              <CsvButton
                onClick={() =>
                  exportToCsv({
                    filename: `pagos-membresias-${range.from}-a-${range.to}.csv`,
                    columns: [
                      { header: 'Fecha de pago', get: (i) => new Date(i.paidAt).toISOString() },
                      { header: 'Jugador', get: fullName },
                      { header: 'Método', get: (i) => METHOD_LABELS[i.paidMethod] ?? i.paidMethod },
                      { header: 'Monto', get: (i) => i.amountCop },
                    ],
                    rows: membership.data.invoices,
                  })
                }
              />
            ) : null
          }
        >
          {(d) => (
            <ul className="divide-y divide-line">
              {d.invoices.map((i) => (
                <Row
                  key={i.id}
                  left={fullName(i)}
                  sub={`${dateOnly(i.paidAt)} · ${METHOD_LABELS[i.paidMethod] ?? i.paidMethod ?? ''}`}
                  right={formatCop(i.amountCop)}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Cartera"
        description={
          cartera.status === 'ready'
            ? `${cartera.data.count} facturas sin pagar · ${formatCop(cartera.data.totalCop)} por cobrar`
            : 'Facturas de membresía pendientes de pago.'
        }
        className="mt-8"
        async={cartera}
        isEmpty={(d) => d.invoices.length === 0}
        empty={{
          title: 'No hay facturas pendientes',
          description: 'Todos los jugadores están al día.',
        }}
        actions={
          cartera.status === 'ready' && cartera.data.invoices.length > 0 ? (
            <CsvButton
              onClick={() =>
                exportToCsv({
                  filename: `cartera-${clubTodayKey()}.csv`,
                  columns: [
                    { header: 'Jugador', get: fullName },
                    { header: 'Vence', get: (i) => new Date(i.dueDate).toISOString().slice(0, 10) },
                    { header: 'Vencida', get: (i) => (i.isOverdue ? 'Sí' : 'No') },
                    { header: 'Monto', get: (i) => i.amountCop },
                  ],
                  rows: cartera.data.invoices,
                })
              }
            />
          ) : null
        }
      >
        {(d) => (
          <ul className="divide-y divide-line">
            {[...d.invoices]
              .sort(
                (a, b) =>
                  Number(b.isOverdue) - Number(a.isOverdue) ||
                  new Date(a.dueDate) - new Date(b.dueDate),
              )
              .map((i) => (
                <Row
                  key={i.id}
                  left={fullName(i)}
                  sub={`Vence el ${dateOnly(i.dueDate)}`}
                  right={formatCop(i.amountCop)}
                  badge={<StatusBadge status={i.isOverdue ? 'vencida' : 'pendiente'} />}
                />
              ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
