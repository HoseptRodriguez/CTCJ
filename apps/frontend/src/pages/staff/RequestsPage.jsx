import { useState } from 'react';

import { affiliationClient } from '../../api/affiliationClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { AnimatedList } from '../../components/motion/AnimatedList.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { TextAreaField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDayShort, formatTime } from '../../lib/format.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import { SectionCard } from '../mictcj/shared.jsx';

import { FormAlert, StaffRow } from './staffShared.jsx';

const when = (iso) => `${formatDayShort(iso)} · ${formatTime(iso)}`;

function permissionsText(g) {
  const list = [g.canBook && 'reservar canchas', g.canPay && 'pagar'].filter(Boolean);
  return list.length ? `Pide poder ${list.join(' y ')}` : 'Sin permisos de reserva ni pago';
}

// Everything that differs between the two kinds of request.
const KINDS = {
  affiliation: {
    title: (r) => `${r.userFirstName} ${r.userLastName}`,
    subtitle: (r) => r.userEmail,
    detail: (r) => (r.notes ? `Su mensaje: “${r.notes}”` : null),
    what: 'Quiere ser jugador del club.',
    approveText: (r) =>
      `${r.userFirstName} pasará a ser jugador del club y podrá usar Mi CTCJ completo.`,
    rejectText: (r) => `${r.userFirstName} seguirá como usuario, sin acceso de jugador.`,
    decide: (id, payload) => affiliationClient.decideRequest(id, payload),
  },
  guardianship: {
    title: (g) => `${g.guardianEmail} → ${g.minorEmail}`,
    subtitle: (g) => permissionsText(g),
    detail: () => null,
    what: 'Un acudiente pide vincular la cuenta de un menor.',
    approveText: (g) => `${g.guardianEmail} quedará como acudiente de ${g.minorEmail}.`,
    rejectText: (g) => `No se creará el vínculo entre ${g.guardianEmail} y ${g.minorEmail}.`,
    decide: (id, payload) => guardianshipClient.decideGuardianship(id, payload),
  },
};

function DecisionPanel({ item, kind, onClose, onDecided }) {
  const toast = useToast();
  const k = KINDS[kind];
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(null); // 'APPROVED' | 'REJECTED'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function decide() {
    setBusy(true);
    try {
      await k.decide(item.id, {
        decision: confirming,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast({
        title: confirming === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        description: k.title(item),
        tone: 'success',
      });
      onDecided(item.id);
    } catch (err) {
      setConfirming(null);
      setError(describeIdentityError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SlidePanel
        open={item != null}
        onClose={onClose}
        title="Revisar solicitud"
        footer={
          <div className="flex flex-col gap-3">
            <Button size="lg" fullWidth onClick={() => setConfirming('APPROVED')}>
              Aprobar
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setConfirming('REJECTED')}
            >
              Rechazar
            </Button>
          </div>
        }
      >
        {item && (
          <div className="space-y-6">
            <div className="rounded-xl bg-page p-5">
              <p className="text-body text-ink-soft">{k.what}</p>
              <p className="mt-2 break-words text-lead font-bold text-ink">{k.title(item)}</p>
              <p className="mt-1 break-words text-body text-ink">{k.subtitle(item)}</p>
              {k.detail(item) && <p className="mt-3 text-body text-ink">{k.detail(item)}</p>}
              <p className="mt-3 text-body-sm text-ink-soft">
                Solicitado el {when(item.requestedAt)}
              </p>
            </div>
            <TextAreaField
              label="Nota para el registro (opcional)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              hint="Por ejemplo, por qué se rechaza."
            />
            <FormAlert>{error}</FormAlert>
          </div>
        )}
      </SlidePanel>
      <ConfirmDialog
        open={confirming != null}
        tone={confirming === 'REJECTED' ? 'danger' : 'primary'}
        title={confirming === 'APPROVED' ? '¿Aprobar la solicitud?' : '¿Rechazar la solicitud?'}
        description={
          item ? (confirming === 'APPROVED' ? k.approveText(item) : k.rejectText(item)) : ''
        }
        confirmLabel={confirming === 'APPROVED' ? 'Sí, aprobar' : 'Sí, rechazar'}
        loading={busy}
        onConfirm={decide}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}

function RequestList({ title, description, kind, async, emptyTitle, onReview }) {
  const k = KINDS[kind];
  return (
    <SectionCard
      title={async.status === 'ready' ? `${title} (${async.data.length})` : title}
      description={description}
      async={async}
      isEmpty={(d) => d.length === 0}
      empty={{ title: emptyTitle }}
      className="mb-8"
    >
      {(list) => (
        <AnimatedList
          aria-label={title}
          items={list}
          getKey={(r) => r.id}
          renderItem={(r) => (
            <StaffRow
              title={<span className="break-words">{k.title(r)}</span>}
              subtitle={<span className="break-words">{k.subtitle(r)}</span>}
              meta={`Solicitado el ${when(r.requestedAt)}`}
              actions={<Button onClick={() => onReview(kind, r.id)}>Revisar</Button>}
            />
          )}
        />
      )}
    </SectionCard>
  );
}

export function RequestsPage() {
  const affiliations = useAsync(
    () => affiliationClient.listRequests('PENDING').then((d) => d.requests),
    [],
  );
  const guardianships = useAsync(
    () => guardianshipClient.listGuardianships('PENDING').then((d) => d.guardianships),
    [],
  );
  const [reviewing, setReviewing] = useState(null); // { kind, id }
  const source = reviewing?.kind === 'guardianship' ? guardianships : affiliations;
  const item = reviewing ? (source.data?.find((x) => x.id === reviewing.id) ?? null) : null;

  return (
    <div>
      <PageHeader
        title="Solicitudes"
        description="Personas que piden ser jugadores y acudientes que piden vincular a un menor."
      />
      <RequestList
        title="Quieren ser jugadores"
        description="Usuarios que pidieron la afiliación al club."
        kind="affiliation"
        async={affiliations}
        emptyTitle="No hay solicitudes de afiliación pendientes"
        onReview={(kind, id) => setReviewing({ kind, id })}
      />
      <RequestList
        title="Vinculaciones familiares"
        description="Acudientes que piden reservar o pagar por un menor."
        kind="guardianship"
        async={guardianships}
        emptyTitle="No hay vinculaciones pendientes"
        onReview={(kind, id) => setReviewing({ kind, id })}
      />
      <DecisionPanel
        key={reviewing ? `${reviewing.kind}-${reviewing.id}` : 'none'}
        item={item}
        kind={reviewing?.kind ?? 'affiliation'}
        onClose={() => setReviewing(null)}
        onDecided={(id) => {
          source.setData((list) => list.filter((x) => x.id !== id));
          setReviewing(null);
        }}
      />
    </div>
  );
}
