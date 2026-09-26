import { MEMBERSHIP_STATUS, ROLE_CODES, ROLE_DEFINITIONS } from '@ctcj/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { billingClient } from '../../api/billingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { SearchIcon } from '../../components/icons/SearchIcon.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { RadioCards, SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeBillingError } from '../../lib/billingErrorMessages.js';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import { addDaysToKey, clubTodayKey } from '../../lib/clubTime.js';
import { formatCop } from '../../lib/format.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { describePlayerMembershipStatus } from '../../lib/playerMembershipStatusLabels.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_MEDIUM, invoiceBadge, MembershipBadge, SectionCard } from '../mictcj/shared.jsx';

import { FormAlert, METHOD_LABELS, ReasonDialog, StaffRow } from './staffShared.jsx';

const dateOnly = (key) => DATE_MEDIUM.format(new Date(`${String(key).slice(0, 10)}T12:00:00Z`));
const fullName = (i) =>
  [i.playerFirstName, i.playerLastName].filter(Boolean).join(' ') || 'Jugador sin nombre';

const STATUS_CHOICES = [
  { value: MEMBERSHIP_STATUS.ACTIVE, label: 'Al día', description: 'Pagó y puede usar todo.' },
  { value: MEMBERSHIP_STATUS.PENDING, label: 'Pendiente', description: 'Tiene un pago por hacer.' },
  { value: MEMBERSHIP_STATUS.OVERDUE, label: 'Vencida', description: 'Se pasó la fecha de pago.' },
  {
    value: MEMBERSHIP_STATUS.SUSPENDED,
    label: 'Suspendida',
    description: 'Suspendida por el club.',
  },
  { value: MEMBERSHIP_STATUS.INACTIVE, label: 'Inactiva', description: 'Dejó de ser miembro.' },
  { value: 'NONE', label: 'Sin membresía', description: 'No tiene membresía registrada.' },
];
const statusLabel = (s) => STATUS_CHOICES.find((c) => c.value === (s ?? 'NONE'))?.label ?? s;

// --- Panels ----------------------------------------------------------------

/** "Registrar pago" of a membership invoice: frozen value + method buttons. */
function InvoicePaymentPanel({ invoice, who, onClose, onPaid }) {
  const toast = useToast();
  const [method, setMethod] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!method) return setError('Elige cómo pagó.');
    setSaving(true);
    setError(null);
    try {
      await billingClient.recordInvoicePayment(invoice.id, {
        method,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast({
        title: 'Pago registrado',
        description: `${who} · ${formatCop(invoice.amountCop)}`,
        tone: 'success',
      });
      onPaid();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={invoice != null}
      onClose={onClose}
      title={`Registrar pago de ${who}`}
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Guardando pago…" onClick={save}>
          Marcar como pagada
        </Button>
      }
    >
      {invoice && (
        <div className="space-y-6">
          <div className="rounded-xl bg-page p-5">
            <p className="text-body font-semibold text-ink-soft">Valor de la factura</p>
            <p className="font-display text-stat font-bold text-ink">
              {formatCop(invoice.amountCop)}
            </p>
            <p className="mt-1 text-body-sm text-ink-soft">
              Vence el {dateOnly(invoice.dueDate)}. El valor no se puede cambiar aquí.
            </p>
          </div>
          <RadioCards
            legend="¿Cómo pagó?"
            name="metodo-factura"
            value={method}
            onChange={(v) => {
              setMethod(v);
              setError(null);
            }}
            options={Object.entries(METHOD_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <TextAreaField
            label="Nota (opcional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            hint="Por ejemplo, el número de la transferencia."
          />
          <FormAlert>{error}</FormAlert>
        </div>
      )}
    </SlidePanel>
  );
}

function StatusPanel({ user, open, onClose, onSaved }) {
  const toast = useToast();
  const [status, setStatus] = useState(user.membershipStatus ?? 'NONE');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true);
    try {
      const result = await membershipClient.setMembershipStatus(
        user.id,
        status === 'NONE' ? null : status,
      );
      toast({
        title: 'Estado actualizado',
        description: `${user.firstName}: ${statusLabel(result.membershipStatus)}`,
        tone: 'success',
      });
      onSaved(result.membershipStatus);
    } catch (err) {
      setConfirming(false);
      setError(describeIdentityError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SlidePanel
        open={open}
        onClose={onClose}
        title="Cambiar estado de membresía"
        footer={
          <Button
            size="lg"
            fullWidth
            onClick={() =>
              (user.membershipStatus ?? 'NONE') === status
                ? setError('Elige un estado distinto al actual.')
                : setConfirming(true)
            }
          >
            Guardar estado
          </Button>
        }
      >
        <div className="space-y-6">
          <p className="text-body text-ink">
            Estado actual de{' '}
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            : {statusLabel(user.membershipStatus)}.
          </p>
          <RadioCards
            legend="Nuevo estado"
            name="estado-membresia"
            options={STATUS_CHOICES}
            value={status}
            onChange={setStatus}
          />
          <p className="rounded-lg bg-navy-50 p-4 text-body text-ink">
            El estado no cambia el rol de la persona. Nunca le quita acceso a su información
            deportiva ni de salud.
          </p>
          <FormAlert>{error}</FormAlert>
        </div>
      </SlidePanel>
      <ConfirmDialog
        open={confirming}
        tone="primary"
        title="¿Cambiar el estado?"
        description={`${user.firstName} pasa de “${statusLabel(user.membershipStatus)}” a “${statusLabel(status)}”.`}
        confirmLabel="Sí, cambiar estado"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function EnrollPanel({ playerId, open, onClose, onSaved }) {
  const toast = useToast();
  const plans = useAsync(() => billingClient.listPlans().then((d) => d.plans), [], {
    enabled: open,
  });
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(clubTodayKey);
  const [billingDay, setBillingDay] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!planId) return setError('Elige un plan.');
    const day = Number(billingDay);
    if (!Number.isInteger(day) || day < 1 || day > 28)
      return setError('El día de cobro va del 1 al 28.');
    setSaving(true);
    setError(null);
    try {
      await billingClient.enrollPlayer({ playerId, planId, startDate, billingDay: day });
      toast({ title: 'Jugador inscrito en el plan', tone: 'success' });
      onSaved();
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
      title="Inscribir en un plan"
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Inscribiendo…" onClick={save}>
          Inscribir
        </Button>
      }
    >
      <div className="space-y-6">
        {plans.status === 'ready' && plans.data.length === 0 ? (
          <p className="text-body text-ink">No hay planes creados. Créalos primero en “Planes”.</p>
        ) : (
          <SelectField
            label="Plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            disabled={plans.status !== 'ready'}
            options={[
              { value: '', label: plans.status === 'ready' ? 'Elige un plan' : 'Cargando planes…' },
              ...(plans.data ?? []).map((p) => ({
                value: p.id,
                label:
                  p.currentPriceCop != null
                    ? `${p.name} · ${formatCop(p.currentPriceCop)}`
                    : `${p.name} (sin precio)`,
              })),
            ]}
          />
        )}
        <TextField
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextField
          label="Día de cobro de cada mes"
          inputMode="numeric"
          value={billingDay}
          onChange={(e) => setBillingDay(e.target.value.replace(/\D/g, ''))}
          hint="Del 1 al 28."
        />
        <FormAlert>{error}</FormAlert>
      </div>
    </SlidePanel>
  );
}

function InvoiceGeneratePanel({ membership, onClose, onSaved }) {
  const toast = useToast();
  const today = clubTodayKey();
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(addDaysToKey(today, 29));
  const [dueDate, setDueDate] = useState(addDaysToKey(today, 5));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!periodStart || !periodEnd || !dueDate) return setError('Completa las tres fechas.');
    if (periodEnd < periodStart) return setError('El fin del período debe ser después del inicio.');
    setSaving(true);
    setError(null);
    try {
      await billingClient.generateInvoice(membership.id, { periodStart, periodEnd, dueDate });
      toast({ title: 'Factura generada', tone: 'success' });
      onSaved();
    } catch (err) {
      setError(describeBillingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={membership != null}
      onClose={onClose}
      title="Generar factura"
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Generando…" onClick={save}>
          Generar factura
        </Button>
      }
    >
      {membership && (
        <div className="space-y-6">
          <p className="text-body text-ink">
            Plan <strong>{membership.planName}</strong>
            {membership.currentPriceCop != null
              ? ` · ${formatCop(membership.currentPriceCop)}`
              : ''}
          </p>
          <TextField
            label="Inicio del período"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <TextField
            label="Fin del período"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
          <TextField
            label="Fecha límite de pago"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <FormAlert>{error}</FormAlert>
        </div>
      )}
    </SlidePanel>
  );
}

// --- Player detail ---------------------------------------------------------

function MembershipInvoices({ membership, who, canEdit, onPay, onCancel, version }) {
  const invoices = useAsync(
    () => billingClient.listInvoices(membership.id).then((d) => d.invoices),
    [membership.id, version],
  );
  if (invoices.status === 'loading')
    return <p className="text-body text-ink-soft">Cargando facturas…</p>;
  if (invoices.status === 'error')
    return <p className="text-body text-ink">No pudimos cargar las facturas.</p>;
  if (invoices.data.length === 0)
    return <p className="text-body text-ink-soft">Sin facturas generadas todavía.</p>;
  return (
    <ul className="space-y-3">
      {[...invoices.data]
        .sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)))
        .map((inv) => {
          const badge = invoiceBadge(inv);
          const pending = inv.status === 'PENDING';
          return (
            <li key={inv.id}>
              <StaffRow
                title={formatCop(inv.amountCop)}
                badge={<StatusBadge status={badge.status} label={badge.label} />}
                subtitle={`Vence el ${dateOnly(inv.dueDate)}`}
                actions={
                  pending && (
                    <>
                      <Button onClick={() => onPay(inv, who)}>Registrar pago</Button>
                      {canEdit && (
                        <Button variant="ghost" onClick={() => onCancel(inv)}>
                          Anular
                        </Button>
                      )}
                    </>
                  )
                }
              />
            </li>
          );
        })}
    </ul>
  );
}

function PlayerDetail({ user, isAdmin, onStatusChanged }) {
  const toast = useToast();
  const isPlayer = (user.roleCodes ?? []).includes(ROLE_CODES.JUGADOR);
  const [version, setVersion] = useState(0);
  const memberships = useAsync(
    () => billingClient.listMemberships(user.id).then((d) => d.memberships),
    [user.id, version],
    {
      enabled: isPlayer,
    },
  );
  const [panel, setPanel] = useState(null); // 'status' | 'enroll' | { invoiceFor } | { pay } | { cancel }
  const who = `${user.firstName} ${user.lastName}`;
  const roleNames = (user.roleCodes ?? [])
    .map((c) => ROLE_DEFINITIONS.find((r) => r.code === c)?.name ?? c)
    .join(', ');
  const refresh = () => {
    setPanel(null);
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-500 p-5 text-white md:p-6">
        <div className="min-w-0">
          <h2 className="break-words font-display text-h2 font-bold">{who}</h2>
          <p className="break-words text-body text-white/90">{user.email}</p>
          <p className="text-body-sm text-white/90">Rol: {roleNames}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white p-1">
            <MembershipBadge status={user.membershipStatus} />
          </span>
          {isAdmin && (
            <Button variant="secondary" tone="dark" onClick={() => setPanel('status')}>
              Cambiar estado
            </Button>
          )}
        </div>
      </div>

      {isPlayer ? (
        <SectionCard
          title="Plan y facturas"
          async={memberships}
          isEmpty={(d) => d.length === 0}
          empty={{
            title: 'No está inscrito en ningún plan',
            action: isAdmin ? (
              <Button onClick={() => setPanel('enroll')}>Inscribir en un plan</Button>
            ) : undefined,
          }}
          actions={
            isAdmin && memberships.status === 'ready' && memberships.data.length > 0 ? (
              <Button variant="secondary" onClick={() => setPanel('enroll')}>
                Inscribir en otro plan
              </Button>
            ) : null
          }
        >
          {(list) => (
            <div className="space-y-8">
              {list.map((m) => (
                <div key={m.id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lead font-bold text-ink">
                      {m.planName}
                      <span className="ml-2 text-body font-normal text-ink-soft">
                        {m.currentPriceCop != null ? formatCop(m.currentPriceCop) : ''} ·{' '}
                        {describePlayerMembershipStatus(m.status)}
                      </span>
                    </p>
                    {isAdmin && (
                      <Button variant="secondary" onClick={() => setPanel({ invoiceFor: m })}>
                        Generar factura
                      </Button>
                    )}
                  </div>
                  <MembershipInvoices
                    membership={m}
                    who={who}
                    canEdit={isAdmin}
                    version={version}
                    onPay={(inv) => setPanel({ pay: inv })}
                    onCancel={(inv) => setPanel({ cancel: inv })}
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : (
        <Card>
          <p className="text-body text-ink">
            Esta persona no es jugador, así que no tiene plan ni facturas.
          </p>
        </Card>
      )}

      {isAdmin && (
        <StatusPanel
          key={`status-${user.id}-${user.membershipStatus}`}
          user={user}
          open={panel === 'status'}
          onClose={() => setPanel(null)}
          onSaved={(s) => {
            setPanel(null);
            onStatusChanged(s);
          }}
        />
      )}
      {isAdmin && (
        <EnrollPanel
          key={panel === 'enroll' ? 'enroll-open' : 'enroll'}
          playerId={user.id}
          open={panel === 'enroll'}
          onClose={() => setPanel(null)}
          onSaved={refresh}
        />
      )}
      <InvoiceGeneratePanel
        key={panel?.invoiceFor?.id ?? 'gen'}
        membership={panel?.invoiceFor ?? null}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <InvoicePaymentPanel
        key={panel?.pay?.id ?? 'pay'}
        invoice={panel?.pay ?? null}
        who={who}
        onClose={() => setPanel(null)}
        onPaid={refresh}
      />
      <ReasonDialog
        open={panel?.cancel != null}
        title="¿Anular la factura?"
        description={
          panel?.cancel
            ? `Factura de ${formatCop(panel.cancel.amountCop)} que vence el ${dateOnly(panel.cancel.dueDate)}. No se puede deshacer.`
            : ''
        }
        confirmLabel="Sí, anular factura"
        describeError={describeBillingError}
        onConfirm={async (reason) => {
          await billingClient.cancelInvoice(panel.cancel.id, { reason });
          toast({ title: 'Factura anulada', tone: 'success' });
          refresh();
        }}
        onCancel={() => setPanel(null)}
      />
    </div>
  );
}

// --- Page ------------------------------------------------------------------

function EmailSearch({ initial, onFound }) {
  const [email, setEmail] = useState(initial ?? '');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function search(value) {
    const q = (value ?? email).trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      onFound(await membershipClient.lookupUser(q));
    } catch (err) {
      setError(describeIdentityError(err));
      onFound(null);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (initial) search(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <TextField
          className="flex-1"
          label="Correo del jugador"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" icon={<SearchIcon />} loading={searching} loadingText="Buscando…">
          Buscar
        </Button>
      </form>
      <FormAlert>{error}</FormAlert>
    </div>
  );
}

function OverduePolicyCard() {
  const toast = useToast();
  const policy = useAsync(() => membershipClient.getOverduePolicy(), []);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const enabled = policy.data?.enabled;

  async function toggle() {
    setSaving(true);
    try {
      const result = await membershipClient.setOverduePolicy(!enabled);
      policy.setData(() => result);
      toast({
        title: result.enabled ? 'Bloqueo por mora activado' : 'Bloqueo por mora desactivado',
        tone: 'success',
      });
    } catch (err) {
      toast({
        title: 'No pudimos cambiar la política',
        description: describeBookingError(err),
        tone: 'error',
      });
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <SectionCard
      title="Bloqueo de reservas por mora"
      description="Si está activo, quien tenga la membresía vencida, inactiva o suspendida no puede hacer reservas nuevas. Nunca afecta su información deportiva ni de salud."
      async={policy}
      className="mt-8"
    >
      {() => (
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge
            status={enabled ? 'vencida' : 'al-dia'}
            label={enabled ? 'Activo' : 'Desactivado'}
          />
          <Button variant={enabled ? 'secondary' : 'primary'} onClick={() => setConfirming(true)}>
            {enabled ? 'Desactivar bloqueo' : 'Activar bloqueo'}
          </Button>
          <ConfirmDialog
            open={confirming}
            tone={enabled ? 'primary' : 'danger'}
            title={enabled ? '¿Desactivar el bloqueo por mora?' : '¿Activar el bloqueo por mora?'}
            description={
              enabled
                ? 'Todos podrán reservar, estén o no al día.'
                : 'Quien no esté al día no podrá hacer reservas nuevas hasta que pague.'
            }
            confirmLabel={enabled ? 'Sí, desactivar' : 'Sí, activar'}
            loading={saving}
            onConfirm={toggle}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}
    </SectionCard>
  );
}

function PendingInvoices({ onOpen }) {
  const pending = useAsync(() => billingClient.listInvoicesClubWide({ status: 'PENDING' }), []);
  return (
    <SectionCard
      title="Facturas por cobrar"
      description={
        pending.status === 'ready'
          ? `${pending.data.count} facturas · ${formatCop(pending.data.totalCop)}`
          : undefined
      }
      async={pending}
      isEmpty={(d) => d.invoices.length === 0}
      empty={{ title: 'No hay facturas por cobrar', description: 'Todos están al día.' }}
    >
      {(d) => (
        <ul className="space-y-3">
          {[...d.invoices]
            .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
            .map((inv) => {
              const badge = invoiceBadge(inv);
              return (
                <li key={inv.id}>
                  <StaffRow
                    title={fullName(inv)}
                    badge={<StatusBadge status={badge.status} label={badge.label} />}
                    subtitle={`${formatCop(inv.amountCop)} · vence el ${dateOnly(inv.dueDate)}`}
                    actions={<Button onClick={() => onOpen(inv)}>Registrar pago</Button>}
                  />
                </li>
              );
            })}
        </ul>
      )}
    </SectionCard>
  );
}

export function MembershipStatusPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles ?? []).includes(ROLE_CODES.ADMINISTRADOR);
  const [params] = useSearchParams();
  const [found, setFound] = useState(null);
  const [paying, setPaying] = useState(null);
  const [pendingVersion, setPendingVersion] = useState(0);

  return (
    <div>
      <PageHeader
        title="Membresías"
        description={
          isAdmin
            ? 'Busca un jugador para ver su estado, su plan y sus facturas, o cobra las facturas pendientes.'
            : 'Busca un jugador para ver su estado y registrar pagos. Solo un administrador puede cambiar estados o facturas.'
        }
      />

      <Card title="Buscar jugador" className="mb-8">
        <EmailSearch initial={params.get('correo')} onFound={setFound} />
      </Card>

      {found ? (
        <PlayerDetail
          key={found.id}
          user={found}
          isAdmin={isAdmin}
          onStatusChanged={(s) => setFound((u) => ({ ...u, membershipStatus: s }))}
        />
      ) : (
        <PendingInvoices key={pendingVersion} onOpen={setPaying} />
      )}

      {isAdmin && <OverduePolicyCard />}

      <InvoicePaymentPanel
        key={paying?.id ?? 'none'}
        invoice={paying}
        who={paying ? fullName(paying) : ''}
        onClose={() => setPaying(null)}
        onPaid={() => {
          setPaying(null);
          setPendingVersion((v) => v + 1);
        }}
      />
    </div>
  );
}
