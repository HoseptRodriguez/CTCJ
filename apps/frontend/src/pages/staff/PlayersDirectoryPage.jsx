import { DOMINANT_HAND_LABELS, ROLE_CODES } from '@ctcj/shared';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { directoryClient } from '../../api/directoryClient.js';
import { SearchIcon } from '../../components/icons/SearchIcon.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CheckboxField, SelectField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatDayShort } from '../../lib/format.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import { CATEGORY_LABELS, SectionCard } from '../mictcj/shared.jsx';

export const MEMBERSHIP_FILTER_LABELS = {
  ACTIVE: 'Al día',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  NONE: 'Sin membresía',
};

const FILTER_KEYS = ['q', 'membership', 'category', 'minor', 'pendingGuardian', 'account'];

/** Membership badge in words ("Sin membresía" when there is none). */
export function MembershipBadgeFor({ status }) {
  if (!status) return <StatusBadge status="suspendida" label="Sin membresía" />;
  return <StatusBadge status={status} />;
}

function DirectoryRow({ person, showMembership }) {
  const name = `${person.firstName} ${person.lastName}`;
  const details = [
    person.categories.length
      ? person.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(' · ')
      : 'Sin categoría',
    person.dominantHand ? DOMINANT_HAND_LABELS[person.dominantHand] : null,
    person.lastLoginAt
      ? `Último ingreso: ${formatDayShort(person.lastLoginAt)}`
      : 'Nunca ha entrado',
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center md:p-5">
      <Avatar src={person.avatarUrl} firstName={person.firstName} lastName={person.lastName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words text-lead font-bold text-ink">{name}</p>
          {showMembership && person.isJugador && (
            <MembershipBadgeFor status={person.membershipStatus} />
          )}
          {!person.isJugador && <StatusBadge status="suspendida" label="Usuario" />}
          {person.pendingGuardianAuthorization && (
            <StatusBadge status="pendiente" label="Pendiente de autorización del acudiente" />
          )}
          {!person.active && <StatusBadge status="vencida" label="Desactivada" />}
        </div>
        <p className="mt-1 text-body text-ink-soft">{details.join(' · ')}</p>
      </div>
      <Button to={`/staff/jugadores/${person.id}`} variant="secondary">
        Ver ficha<span className="sr-only"> de {name}</span>
      </Button>
    </li>
  );
}

/**
 * Staff → Jugadores: every player (and, for the front desk, every account)
 * with a search box and big filters. The filters live in the URL, so a
 * filtered list can be shared or reloaded.
 */
export function PlayersDirectoryPage() {
  useDocumentTitle('Jugadores');
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes(ROLE_CODES.ADMINISTRADOR);
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const tab = params.get('tab') ?? 'players';
  const page = Number(params.get('page') ?? 1);
  const [query, setQuery] = useState(filters.q);
  const [exporting, setExporting] = useState(false);

  const key = params.toString();
  const directory = useAsync(() => directoryClient.list({ ...filters, tab, page }), [key]);
  const data = directory.data;
  const frontDesk = data ? data.tabs.includes('all') : false;

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v === undefined || v === null || v === false) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  // Search as the person types, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== filters.q) update({ q: query.trim() });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function exportCsv() {
    setExporting(true);
    try {
      await directoryClient.exportCsv({ ...filters, tab });
      toast({ title: 'Descargamos el archivo CSV', tone: 'success' });
    } catch (err) {
      toast({
        title: 'No pudimos exportar',
        description: describeIdentityError(err),
        tone: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tabOptions = data
    ? [
        { value: 'players', label: `Jugadores (${data.totals.players})` },
        ...(frontDesk
          ? [{ value: 'all', label: `Todos los usuarios (${data.totals.users})` }]
          : []),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Jugadores"
        description="Busca a una persona y abre su ficha."
        actions={
          isAdmin ? (
            <Button
              variant="secondary"
              onClick={exportCsv}
              loading={exporting}
              loadingText="Preparando…"
            >
              Exportar CSV
            </Button>
          ) : null
        }
      />
      {tabOptions.length > 1 && (
        <SegmentedControl
          label="Qué lista ver"
          options={tabOptions}
          value={data.tab}
          onChange={(value) => update({ tab: value === 'players' ? '' : value })}
          className="mb-6"
        />
      )}

      <section
        aria-label="Buscar y filtrar"
        className="mb-6 space-y-4 rounded-xl border border-line bg-surface p-4 md:p-5"
      >
        <div>
          <label htmlFor="buscar-persona" className="mb-2 block text-body font-semibold text-ink">
            Buscar por nombre, correo o celular
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
            <input
              id="buscar-persona"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              className="focus-ring block min-h-btn-lg w-full rounded-lg border-2 border-line-strong bg-surface pl-12 pr-4 text-body text-ink"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frontDesk && (
            <SelectField
              label="Estado de membresía"
              value={filters.membership}
              onChange={(e) => update({ membership: e.target.value })}
              options={[
                { value: '', label: 'Todos' },
                ...Object.entries(MEMBERSHIP_FILTER_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          )}
          <SelectField
            label="Categoría"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            options={[
              { value: '', label: 'Todas' },
              ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <SelectField
            label="Cuenta"
            value={filters.account}
            onChange={(e) => update({ account: e.target.value })}
            options={[
              { value: '', label: 'Activas y desactivadas' },
              { value: 'active', label: 'Solo activas' },
              { value: 'deactivated', label: 'Solo desactivadas' },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField
            checked={filters.minor === 'true'}
            onChange={(v) => update({ minor: v ? 'true' : '' })}
          >
            Solo menores de edad
          </CheckboxField>
          <CheckboxField
            checked={filters.pendingGuardian === 'true'}
            onChange={(v) => update({ pendingGuardian: v ? 'true' : '' })}
          >
            Solo pendientes de autorización del acudiente
          </CheckboxField>
        </div>
      </section>

      <SectionCard
        title={data ? `${data.total} ${data.total === 1 ? 'persona' : 'personas'}` : 'Personas'}
        async={directory}
        isEmpty={(d) => d.items.length === 0}
        empty={{
          title: 'Nadie coincide con la búsqueda',
          description: 'Prueba con otra palabra o quita algún filtro.',
        }}
      >
        {(d) => (
          <>
            <ul className="space-y-3" aria-label="Resultados">
              {d.items.map((person) => (
                <DirectoryRow key={person.id} person={person} showMembership={frontDesk} />
              ))}
            </ul>
            {pages > 1 && (
              <nav
                aria-label="Páginas"
                className="mt-6 flex flex-wrap items-center justify-between gap-3"
              >
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Anterior
                </Button>
                <p className="text-body text-ink" aria-live="polite">
                  Página {page} de {pages}
                </p>
                <Button
                  variant="secondary"
                  disabled={page >= pages}
                  onClick={() => update({ page: page + 1 })}
                >
                  Siguiente
                </Button>
              </nav>
            )}
          </>
        )}
      </SectionCard>
      <p className="mt-4 text-body-sm text-ink-soft">
        ¿Buscas una solicitud? Están en{' '}
        <Link
          to="/staff/solicitudes"
          className="font-semibold text-navy-500 underline underline-offset-4"
        >
          Solicitudes
        </Link>
        .
      </p>
    </div>
  );
}
