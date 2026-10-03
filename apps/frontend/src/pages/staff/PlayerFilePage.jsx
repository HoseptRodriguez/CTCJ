import { BACKHAND_LABELS, DOMINANT_HAND_LABELS, ROLE_CODES } from '@ctcj/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { billingClient } from '../../api/billingClient.js';
import { clinicalClient } from '../../api/clinicalClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { directoryClient } from '../../api/directoryClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatCop, formatDayShort, formatReservationSpan } from '../../lib/format.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  CATEGORY_LABELS,
  DATE_MEDIUM,
  MODALITY_LABELS,
  NOTE_TYPE_LABELS,
  SectionCard,
  invoiceBadge,
} from '../mictcj/shared.jsx';

import { FitnessBadge } from './PhysioAccess.jsx';
import { StaffRolesCard } from './StaffRolesCard.jsx';
import { MembershipBadgeFor } from './PlayersDirectoryPage.jsx';

const { ADMINISTRADOR, RECEPCION, ENTRENADOR } = ROLE_CODES;

const CONSENT_LABELS = {
  PRIVACY_POLICY: 'Política de datos',
  TERMS: 'Términos y condiciones',
  MARKETING: 'Novedades y promociones',
  MINOR_DATA_IMAGE: 'Datos e imagen del menor (acudiente)',
  HEALTH_DATA: 'Datos de salud',
  COMMUNITY_RULES: 'Reglas de la Comunidad',
  COOKIES: 'Cookies',
};
const GUARDIANSHIP_LABELS = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  REVOKED: 'Retirada',
};
const TOURNAMENT_STATUS = {
  DRAFT: 'Inscripciones',
  DRAW_GENERATED: 'En juego',
  COMPLETED: 'Terminado',
  CANCELLED: 'Cancelado',
};

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-body-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="mt-1 text-body text-ink">{children || '—'}</dd>
    </div>
  );
}

function ageOf(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < b.getUTCMonth() ||
    (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  return beforeBirthday ? age - 1 : age;
}

function DataTab({ file, showDocument }) {
  const doc = useAsync(() => membershipClient.getUserDocument(file.id), [file.id], {
    enabled: showDocument,
  });
  const age = ageOf(file.birthDate);
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      <Field label="Correo">{file.email}</Field>
      <Field label="Celular">{file.phone}</Field>
      <Field label="Fecha de nacimiento">
        {file.birthDate
          ? `${DATE_MEDIUM.format(new Date(`${String(file.birthDate).slice(0, 10)}T12:00:00-05:00`))}${age != null ? ` (${age} años)` : ''}`
          : null}
      </Field>
      <Field label="Mano dominante">{DOMINANT_HAND_LABELS[file.dominantHand]}</Field>
      <Field label="Revés">{BACKHAND_LABELS[file.backhand]}</Field>
      <Field label="Categoría">
        {file.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(' · ') || 'Sin categoría'}
      </Field>
      <Field label="Correo confirmado">{file.emailVerified ? 'Sí' : 'No'}</Field>
      <Field label="Último ingreso">
        {file.lastLoginAt ? formatDayShort(file.lastLoginAt) : 'Nunca ha entrado'}
      </Field>
      <Field label="Registro">{formatDayShort(file.createdAt)}</Field>
      {showDocument && (
        <Field label="Documento de identidad">
          {doc.status === 'ready' && doc.data?.documentNumber
            ? `${doc.data.documentType} ${doc.data.documentNumber}`
            : doc.status === 'loading'
              ? 'Cargando…'
              : 'Sin registrar'}
        </Field>
      )}
    </dl>
  );
}

function MembershipTab({ file }) {
  const memberships = useAsync(
    () => billingClient.listMemberships(file.id).then((d) => d.memberships),
    [file.id],
  );
  const invoices = useAsync(
    async () => {
      const list = memberships.data ?? [];
      const all = await Promise.all(
        list.map((m) =>
          billingClient
            .listInvoices(m.id)
            .then((d) => d.invoices.map((inv) => ({ ...inv, planName: m.planName }))),
        ),
      );
      return all.flat().sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)));
    },
    [memberships.status],
    { enabled: memberships.status === 'ready' },
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-body font-semibold text-ink">Estado de membresía:</span>
        <MembershipBadgeFor status={file.membershipStatus} />
        <Link
          to={`/staff/membresias?correo=${encodeURIComponent(file.email)}`}
          className="focus-ring inline-flex min-h-btn items-center rounded-lg font-semibold text-navy-500 underline underline-offset-4"
        >
          Cobrar o facturar en Membresías
        </Link>
      </div>
      <SectionCard
        title="Planes"
        async={memberships}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'No está inscrito en ningún plan' }}
      >
        {(list) => (
          <ul className="space-y-2">
            {list.map((m) => (
              <li key={m.id} className="text-body text-ink">
                <strong>{m.planName}</strong>
                {m.currentPriceCop != null ? ` · ${formatCop(m.currentPriceCop)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard
        title="Facturas"
        async={invoices.status === 'idle' ? memberships : invoices}
        isEmpty={(d) => !Array.isArray(d) || d.length === 0}
        empty={{ title: 'Sin facturas' }}
      >
        {(list) => (
          <ul className="space-y-2">
            {list.map((inv) => {
              const badge = invoiceBadge(inv);
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 text-body text-ink">
                  <span>
                    {formatCop(inv.amountCop)} · {inv.planName} · vence el{' '}
                    {String(inv.dueDate).slice(0, 10)}
                  </span>
                  <StatusBadge status={badge.status} label={badge.label} />
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function ReservationsTab({ file }) {
  const reservations = useAsync(
    () => directoryClient.getPlayerReservations(file.id).then((d) => d.reservations),
    [file.id],
  );
  return (
    <SectionCard
      title="Próximas reservas"
      async={reservations}
      isEmpty={(d) => d.length === 0}
      empty={{ title: 'No tiene reservas próximas' }}
    >
      {(list) => (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="text-body text-ink">
              {formatReservationSpan(r.periodStart, r.periodEnd)} · {r.courtName ?? 'Cancha'}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CompetitionTab({ file }) {
  const summary = useAsync(() => directoryClient.getPlayerCompetition(file.id), [file.id]);
  const tournaments = useAsync(
    () => directoryClient.getPlayerTournaments(file.id).then((d) => d.tournaments),
    [file.id],
  );
  return (
    <div className="space-y-6">
      <SectionCard
        title="Ranking de la temporada"
        async={summary}
        isEmpty={(d) => !d.hasSeason || d.categories.length === 0}
        empty={{ title: 'Sin partidos en la temporada actual' }}
      >
        {(d) => (
          <ul className="space-y-2">
            {d.categories.map((c) => (
              <li key={`${c.category}-${c.modality}`} className="text-body text-ink">
                <strong>
                  {CATEGORY_LABELS[c.category]} · {MODALITY_LABELS[c.modality]}
                </strong>
                : puesto {c.rank ?? '—'} · {c.points} puntos · {c.wins} ganados, {c.losses} perdidos
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard
        title="Torneos"
        async={tournaments}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'No ha jugado torneos' }}
      >
        {(list) => (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id} className="text-body text-ink">
                <strong>{t.name}</strong> · {CATEGORY_LABELS[t.category]} ·{' '}
                {MODALITY_LABELS[t.modality]} · {TOURNAMENT_STATUS[t.status] ?? t.status}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function CoachingTab({ file }) {
  const notes = useAsync(
    () => coachingClient.listPlayerNotes(file.id).then((d) => d.notes),
    [file.id],
  );
  return (
    <SectionCard
      title="Notas del entrenador"
      async={notes}
      isEmpty={(d) => d.length === 0}
      empty={{
        title: 'Sin notas todavía',
        description: 'Se escriben en «Notas y rendimiento».',
      }}
      actions={
        <Link
          to={`/staff/notas?jugador=${file.id}&nombre=${encodeURIComponent(`${file.firstName} ${file.lastName}`)}`}
          className="focus-ring inline-flex min-h-btn items-center rounded-lg font-semibold text-navy-500 underline underline-offset-4"
        >
          Escribir nota o calificar
        </Link>
      }
    >
      {(list) => (
        <ul className="space-y-3">
          {list.slice(0, 10).map((n) => (
            <li key={n.id} className="rounded-lg bg-page p-3">
              <p className="text-body-sm font-semibold text-ink-soft">
                {NOTE_TYPE_LABELS[n.noteType] ?? n.noteType} · {formatDayShort(n.createdAt)}
              </p>
              <p className="text-body text-ink">{n.content}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/** Operational only: fit or not fit to play. Never clinical content. */
function HealthTab({ file }) {
  const summary = useAsync(() => clinicalClient.getPhysioSummary(file.id), [file.id]);
  return (
    <Card title="Aptitud para jugar">
      {summary.status === 'loading' && <p className="text-body text-ink-soft">Cargando…</p>}
      {summary.status === 'error' && (
        <p className="text-body text-ink">No pudimos cargar la aptitud.</p>
      )}
      {summary.status === 'ready' && <FitnessBadge fitness={summary.data.fitness} />}
      <p className="mt-4 text-body-sm text-ink-soft">
        Aquí solo se muestra si está apto o no para jugar. Las notas y la historia clínica siguen
        sus propias reglas de autorización en «Salud y bienestar».
      </p>
    </Card>
  );
}

function ConsentsTab({ file }) {
  if (!file.consents.length)
    return <p className="text-body text-ink-soft">Sin autorizaciones registradas.</p>;
  return (
    <ul className="space-y-2">
      {[...file.consents].reverse().map((c, i) => (
        <li
          key={`${c.type}-${c.at}-${i}`}
          className="flex flex-wrap items-center gap-3 text-body text-ink"
        >
          <strong>{CONSENT_LABELS[c.type] ?? c.type}</strong>
          <StatusBadge
            status={c.accepted ? 'al-dia' : 'suspendida'}
            label={c.accepted ? 'Aceptada' : 'Retirada'}
          />
          <span className="text-ink-soft">
            {formatDayShort(c.at)} · versión {c.version}
            {c.givenBy ? ` · por ${c.givenBy.firstName} ${c.givenBy.lastName} (acudiente)` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FamilyTab({ file }) {
  const row = (g) => (
    <li key={g.id} className="flex flex-wrap items-center gap-3 text-body text-ink">
      {g.person ? (
        <Link
          to={`/staff/jugadores/${g.person.id}`}
          className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
        >
          {g.person.firstName} {g.person.lastName}
        </Link>
      ) : (
        'Cuenta eliminada'
      )}
      <StatusBadge
        status={g.status === 'APPROVED' ? 'al-dia' : 'pendiente'}
        label={GUARDIANSHIP_LABELS[g.status] ?? g.status}
      />
      <span className="text-ink-soft">
        {[g.canBook && 'reserva', g.canPay && 'paga'].filter(Boolean).join(' y ') || 'sin permisos'}
      </span>
    </li>
  );
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lead font-semibold text-ink">Acudientes</h3>
        {file.guardians.length ? (
          <ul className="space-y-2">{file.guardians.map(row)}</ul>
        ) : (
          <p className="text-body text-ink-soft">No tiene acudientes vinculados.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-lead font-semibold text-ink">Menores a su cargo</h3>
        {file.minors.length ? (
          <ul className="space-y-2">{file.minors.map(row)}</ul>
        ) : (
          <p className="text-body text-ink-soft">No tiene menores vinculados.</p>
        )}
      </div>
    </div>
  );
}

const ACTIONS = {
  grant: {
    title: '¿Darle el rol de jugador?',
    text: (n) => `${n} podrá reservar como jugador y usar Mi CTCJ completo.`,
    confirm: 'Sí, dar rol de jugador',
    run: (id) => directoryClient.grantPlayerRole(id),
    done: 'Ahora es jugador',
  },
  revoke: {
    title: '¿Quitarle el rol de jugador?',
    text: (n) => `${n} seguirá con su cuenta, pero sin acceso de jugador. Sus datos se conservan.`,
    confirm: 'Sí, quitar rol',
    run: (id) => directoryClient.revokePlayerRole(id),
    done: 'Ya no es jugador',
    danger: true,
  },
  deactivate: {
    title: '¿Desactivar la cuenta?',
    text: (n) =>
      `${n} no podrá entrar y se cerrarán sus sesiones abiertas. Sus datos se conservan y la cuenta se puede reactivar.`,
    confirm: 'Sí, desactivar',
    run: (id) => directoryClient.deactivate(id),
    done: 'Cuenta desactivada',
    danger: true,
  },
  reactivate: {
    title: '¿Reactivar la cuenta?',
    text: (n) => `${n} podrá volver a entrar.`,
    confirm: 'Sí, reactivar',
    run: (id) => directoryClient.reactivate(id),
    done: 'Cuenta reactivada',
  },
  mfaReset: {
    title: '¿Restablecer la verificación en dos pasos?',
    text: (n) =>
      `Úsalo si ${n} perdió el teléfono. Se desactiva, se cierran sus sesiones y, si su rol la exige, la configurará de nuevo al entrar.`,
    confirm: 'Sí, restablecer',
    run: (id) => directoryClient.resetMfa(id),
    done: 'Verificación en dos pasos restablecida',
    danger: true,
  },
  resend: {
    title: '¿Reenviar el correo de confirmación?',
    text: (n) => `Le enviaremos a ${n} un enlace nuevo para confirmar su correo.`,
    confirm: 'Sí, reenviar',
    run: (id) => directoryClient.resendVerification(id),
    done: 'Correo reenviado',
  },
};

/** Staff → Jugadores → a person's file. Tabs depend on who is looking. */
export function PlayerFilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const roles = user?.roles ?? [];
  const has = (...r) => r.some((x) => roles.includes(x));
  const isAdmin = has(ADMINISTRADOR);
  const frontDesk = has(ADMINISTRADOR, RECEPCION);
  const file = useAsync(() => directoryClient.getFile(id), [id]);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const f = file.data;
  useDocumentTitle(f ? `${f.firstName} ${f.lastName}` : 'Ficha');

  async function run() {
    setBusy(true);
    try {
      await ACTIONS[action].run(id);
      toast({ title: ACTIONS[action].done, tone: 'success' });
      file.reload();
    } catch (err) {
      toast({ title: 'No se pudo hacer', description: describeIdentityError(err), tone: 'error' });
    } finally {
      setBusy(false);
      setAction(null);
    }
  }

  if (file.status === 'loading' || file.status === 'idle') {
    return (
      <SkeletonGroup label="Cargando la ficha…" className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </SkeletonGroup>
    );
  }
  if (file.status === 'error') {
    return (
      <div>
        <PageHeader title="Ficha" backTo="/staff/jugadores" backLabel="Volver a Jugadores" />
        <ErrorState
          title={
            file.error?.status === 404
              ? 'No encontramos a esta persona'
              : 'No pudimos cargar la ficha'
          }
          onRetry={file.reload}
        />
      </div>
    );
  }

  const name = `${f.firstName} ${f.lastName}`;
  const tabs = [
    { id: 'datos', label: 'Datos', content: <DataTab file={f} showDocument={frontDesk} /> },
    frontDesk &&
      f.isJugador && {
        id: 'membresia',
        label: 'Membresía y facturas',
        content: <MembershipTab file={f} />,
      },
    frontDesk && { id: 'reservas', label: 'Reservas', content: <ReservationsTab file={f} /> },
    f.isJugador && {
      id: 'ranking',
      label: 'Ranking y torneos',
      content: <CompetitionTab file={f} />,
    },
    has(ADMINISTRADOR, ENTRENADOR) &&
      f.isJugador && {
        id: 'notas',
        label: 'Notas y rendimiento',
        content: <CoachingTab file={f} />,
      },
    // Same rule as the clinical module: only Administración (and physiotherapy).
    isAdmin && f.isJugador && { id: 'salud', label: 'Salud', content: <HealthTab file={f} /> },
    frontDesk && {
      id: 'autorizaciones',
      label: 'Autorizaciones',
      content: <ConsentsTab file={f} />,
    },
    frontDesk && { id: 'familia', label: 'Acudiente y menores', content: <FamilyTab file={f} /> },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={name}
        backTo="/staff/jugadores"
        backLabel="Volver a Jugadores"
        className="mb-6 md:mb-6"
      />
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar src={f.avatarUrl} firstName={f.firstName} lastName={f.lastName} size="lg" />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <StatusBadge
              status={f.isJugador ? 'al-dia' : 'suspendida'}
              label={f.isJugador ? 'Jugador' : 'Usuario sin rol de jugador'}
            />
            {frontDesk && f.isJugador && <MembershipBadgeFor status={f.membershipStatus} />}
            {f.isMinor && <StatusBadge status="pendiente" label="Menor de edad" />}
            {f.pendingGuardianAuthorization && (
              <StatusBadge status="pendiente" label="Pendiente de autorización del acudiente" />
            )}
            {!f.active && <StatusBadge status="vencida" label="Cuenta desactivada" />}
          </div>
        </div>
        {(isAdmin || (frontDesk && !f.emailVerified)) && !f.deleted && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
            {isAdmin && (
              <Button
                variant="secondary"
                onClick={() => setAction(f.isJugador ? 'revoke' : 'grant')}
              >
                {f.isJugador ? 'Quitar rol de jugador' : 'Dar rol de jugador'}
              </Button>
            )}
            {isAdmin && (
              <Button
                variant={f.active ? 'danger' : 'secondary'}
                onClick={() => setAction(f.active ? 'deactivate' : 'reactivate')}
              >
                {f.active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              </Button>
            )}
            {isAdmin && f.mfaEnabled && (
              <Button variant="secondary" onClick={() => setAction('mfaReset')}>
                Restablecer verificación en dos pasos
              </Button>
            )}
            {frontDesk && !f.emailVerified && (
              <Button variant="secondary" onClick={() => setAction('resend')}>
                Reenviar correo de confirmación
              </Button>
            )}
          </div>
        )}
      </Card>
      {isAdmin && !f.deleted && f.id !== user?.id && (
        <StaffRolesCard file={f} onChanged={file.reload} />
      )}
      <Tabs label={`Ficha de ${name}`} tabs={tabs} />
      <ConfirmDialog
        open={action != null}
        tone={action && ACTIONS[action].danger ? 'danger' : 'primary'}
        title={action ? ACTIONS[action].title : ''}
        description={action ? ACTIONS[action].text(name) : ''}
        confirmLabel={action ? ACTIONS[action].confirm : ''}
        loading={busy}
        onConfirm={run}
        onCancel={() => setAction(null)}
      />
    </div>
  );
}
