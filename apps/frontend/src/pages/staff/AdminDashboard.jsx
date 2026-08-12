import { useEffect, useState } from 'react';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { bogotaTodayKey } from '../reservation/DatePicker.jsx';

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

// Real, documented club operating hours (matches BookingGrid.jsx exactly)
// -- the denominator for a real occupancy percentage, not a guess.
const OPEN_HOUR = 5;
const CLOSE_HOUR = 22;
const HOURS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;

const OCCUPYING_STATUSES = ['HOLD', 'CONFIRMED'];

const SHORTCUTS = [
  { to: '/staff/pagos', label: 'Pagos' },
  { to: '/staff/membresias', label: 'Membresías' },
  { to: '/staff/notas', label: 'Notas de entrenadores' },
  { to: '/staff/clinico', label: 'Salud y bienestar' },
  { to: '/staff/competicion', label: 'Competición' },
  { to: '/staff/torneos', label: 'Torneos' },
  { to: '/staff/precios', label: 'Precios de canchas' },
  { to: '/staff/solicitudes', label: 'Solicitudes' },
  { to: '/staff/planes', label: 'Planes' },
  { to: '/staff/finanzas', label: 'Finanzas' },
];

function daysAgoKey(baseKey, days) {
  const [year, month, day] = baseKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-canvas p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-primary">{value}</p>
      {detail ? <p className="mt-1 text-sm text-secondary">{detail}</p> : null}
    </div>
  );
}

function TodayReservationsCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    bookingClient
      .getSchedule(bogotaTodayKey())
      .then((schedule) => {
        if (cancelled) return;
        const occupying = schedule.reservations.filter((r) =>
          OCCUPYING_STATUSES.includes(r.status),
        );
        setData({ count: occupying.length });
      })
      .catch(() => {
        if (!cancelled) setData({ count: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StatCard
      label="Reservas de hoy"
      value={data ? (data.count ?? '—') : '...'}
      detail={
        <Button to="/staff/pagos" variant="ghost" className="px-0 text-xs">
          Ver agenda
        </Button>
      }
    />
  );
}

function OccupancyCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([bookingClient.listCourts(), bookingClient.getSchedule(bogotaTodayKey())])
      .then(([{ courts }, schedule]) => {
        if (cancelled) return;
        const occupying = schedule.reservations.filter((r) =>
          OCCUPYING_STATUSES.includes(r.status),
        ).length;
        const totalSlots = courts.length * HOURS_PER_DAY;
        const pct = totalSlots > 0 ? Math.round((occupying / totalSlots) * 100) : 0;
        setData({ pct, courts: courts.length });
      })
      .catch(() => {
        if (!cancelled) setData({ pct: null, courts: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StatCard
      label="Ocupación de canchas (hoy)"
      value={data ? (data.pct != null ? `${data.pct}%` : '—') : '...'}
      detail={data?.courts != null ? `${data.courts} canchas activas` : null}
    />
  );
}

function PendingPaymentsCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    billingClient
      .listInvoicesClubWide({ status: 'PENDING' })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ invoices: [], totalCop: null, count: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StatCard
      label="Pagos pendientes"
      value={data ? (data.totalCop != null ? COP_FORMATTER.format(data.totalCop) : '—') : '...'}
      detail={data ? `${data.count} facturas` : null}
    />
  );
}

function RevenueCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      bookingClient.getMonthlyRevenue({ months: 1 }),
      billingClient.getMonthlyRevenue({ months: 1 }),
    ])
      .then(([court, membership]) => {
        if (cancelled) return;
        const total = (court.months[0]?.totalCop ?? 0) + (membership.months[0]?.totalCop ?? 0);
        setData({ total });
      })
      .catch(() => {
        if (!cancelled) setData({ total: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StatCard
      label="Ingresos este mes"
      value={data ? (data.total != null ? COP_FORMATTER.format(data.total) : '—') : '...'}
      detail={
        <Button to="/staff/finanzas" variant="ghost" className="px-0 text-xs">
          Ver flujo de caja
        </Button>
      }
    />
  );
}

function ActivePlayersCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    membershipClient
      .getPlayerCounts()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ ACTIVE: null, total: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StatCard
      label="Jugadores activos"
      value={data ? (data.ACTIVE ?? '—') : '...'}
      detail={data?.total != null ? `${data.total} jugadores en total` : null}
    />
  );
}

function PendingRequestsCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([affiliationClient.listRequests(), guardianshipClient.listGuardianships()])
      .then(([affiliation, guardianship]) => {
        if (cancelled) return;
        setData({ count: affiliation.requests.length + guardianship.guardianships.length });
      })
      .catch(() => {
        if (!cancelled) setData({ count: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StatCard
      label="Solicitudes pendientes"
      value={data ? (data.count ?? '—') : '...'}
      detail={
        <Button to="/staff/solicitudes" variant="ghost" className="px-0 text-xs">
          Revisar solicitudes
        </Button>
      }
    />
  );
}

function RecentActivitySection() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const today = bogotaTodayKey();
    const weekAgo = daysAgoKey(today, 7);

    Promise.all([
      bookingClient.listPayments({ from: weekAgo, to: today }),
      billingClient.listInvoicesClubWide({ status: 'PAID', from: weekAgo, to: today }),
      affiliationClient.listRequests(),
      guardianshipClient.listGuardianships(),
    ])
      .then(([courtPayments, membershipPayments, affiliation, guardianship]) => {
        if (cancelled) return;
        const feed = [
          ...courtPayments.payments.map((p) => ({
            id: `court-payment-${p.id}`,
            at: p.recordedAt,
            text: `Pago de cancha registrado · ${COP_FORMATTER.format(p.amountCop)}`,
          })),
          ...membershipPayments.invoices.map((i) => ({
            id: `membership-payment-${i.id}`,
            at: i.paidAt,
            text: `Pago de membresía · ${i.playerFirstName ?? ''} ${i.playerLastName ?? ''} · ${COP_FORMATTER.format(i.amountCop)}`,
          })),
          ...affiliation.requests.map((r) => ({
            id: `affiliation-${r.id}`,
            at: r.requestedAt,
            text: 'Nueva solicitud de afiliación pendiente',
          })),
          ...guardianship.guardianships.map((g) => ({
            id: `guardianship-${g.id}`,
            at: g.requestedAt,
            text: `Nueva solicitud de vinculación familiar · ${g.minorEmail}`,
          })),
        ]
          .sort((a, b) => new Date(b.at) - new Date(a.at))
          .slice(0, 8);
        setItems(feed);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Actividad reciente</h3>
      <p className="mt-1 text-sm text-secondary">Pagos y solicitudes de los últimos 7 días.</p>

      {items === null ? <p className="mt-3 text-sm text-secondary">Cargando...</p> : null}
      {items?.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">Sin actividad reciente.</p>
      ) : null}
      {items?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-1 rounded-md bg-raised px-4 py-2 text-sm"
            >
              <span className="text-secondary">{item.text}</span>
              <span className="text-xs text-tertiary">
                {DATE_TIME_FORMATTER.format(new Date(item.at))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ShortcutsSection() {
  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Accesos rápidos</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((shortcut) => (
          <Button key={shortcut.to} to={shortcut.to} variant="outline" className="justify-center">
            {shortcut.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Panel de administración</h1>
      <p className="mt-1 text-secondary">
        Resumen del club en tiempo real: reservas, pagos, ocupación y solicitudes.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TodayReservationsCard />
        <OccupancyCard />
        <PendingPaymentsCard />
        <RevenueCard />
        <ActivePlayersCard />
        <PendingRequestsCard />
      </div>

      <RecentActivitySection />
      <ShortcutsSection />
    </div>
  );
}
