import { ROLE_CODES } from '@ctcj/shared';
import { useState } from 'react';

import { tournamentClient } from '../../api/tournamentClient.js';
import { ArrowLeftIcon } from '../../components/icons/ArrowLeftIcon.jsx';
import { PlusIcon } from '../../components/icons/PlusIcon.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { cn } from '../../components/ui/cn.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { SelectField, TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { clubTodayKey } from '../../lib/clubTime.js';
import { describeTournamentError } from '../../lib/tournamentErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import { CATEGORY_LABELS, MODALITY_LABELS, SectionCard } from '../mictcj/shared.jsx';

import { NumberChoice, ParticipantSlot } from './matchInputs.jsx';
import { FormAlert, StaffRow } from './staffShared.jsx';

// Same role sets the backend enforces on these routes.
const STAFF_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION, ROLE_CODES.ENTRENADOR];

const STATUS = {
  DRAFT: { label: 'Inscripciones abiertas', badge: 'pendiente' },
  DRAW_GENERATED: { label: 'En curso', badge: 'al-dia' },
  COMPLETED: { label: 'Finalizado', badge: 'suspendida' },
  CANCELLED: { label: 'Cancelado', badge: 'vencida' },
};

function participantLabel(p) {
  if (!p) return null;
  const names = p.members
    .map((m) => (m.firstName ? `${m.firstName} ${m.lastName ?? ''}`.trim() : null))
    .filter(Boolean);
  return names.length ? names.join(' y ') : 'Jugador';
}

function StatusPill({ status }) {
  const s = STATUS[status] ?? { label: status, badge: 'suspendida' };
  return <StatusBadge status={s.badge} label={s.label} />;
}

// --- Panels ----------------------------------------------------------------

function NewTournamentPanel({ open, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('SEGUNDA');
  const [modality, setModality] = useState('SINGLES');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!name.trim()) return setError('Escribe el nombre del torneo.');
    setSaving(true);
    setError(null);
    try {
      await tournamentClient.createTournament({ name: name.trim(), category, modality });
      toast({
        title: 'Torneo creado',
        description: 'Ya puedes inscribir participantes.',
        tone: 'success',
      });
      onSaved();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Nuevo torneo"
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Creando…" onClick={save}>
          Crear torneo
        </Button>
      }
    >
      <div className="space-y-6">
        <TextField
          label="Nombre del torneo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Ejemplo: Abierto de Octubre"
        />
        <SelectField
          label="Categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <SegmentedControl
          label="Modalidad"
          value={modality}
          onChange={setModality}
          options={Object.entries(MODALITY_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <FormAlert>{error}</FormAlert>
      </div>
    </SlidePanel>
  );
}

function AddParticipantPanel({ tournament, open, onClose, onSaved, allowEmail }) {
  const toast = useToast();
  const slots = tournament.modality === 'SINGLES' ? 1 : 2;
  const [players, setPlayers] = useState(() => Array(slots).fill(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (players.some((p) => !p))
      return setError(
        slots === 1 ? 'Elige el jugador.' : 'Elige a los dos jugadores de la pareja.',
      );
    if (slots === 2 && players[0].id === players[1].id)
      return setError('La pareja debe tener dos jugadores distintos.');
    setSaving(true);
    setError(null);
    try {
      await tournamentClient.addParticipant(
        tournament.id,
        players.map((p) => p.id),
      );
      toast({
        title: 'Inscripción hecha',
        description: players.map((p) => `${p.firstName} ${p.lastName}`).join(' y '),
        tone: 'success',
      });
      onSaved();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={slots === 1 ? 'Inscribir jugador' : 'Inscribir pareja'}
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Inscribiendo…" onClick={save}>
          Inscribir
        </Button>
      }
    >
      <div className="space-y-6">
        {players.map((p, i) => (
          <ParticipantSlot
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            label={slots === 1 ? 'Jugador' : `Jugador ${i + 1}`}
            value={p}
            allowEmail={allowEmail}
            onChange={(v) => setPlayers((prev) => prev.map((x, j) => (j === i ? v : x)))}
          />
        ))}
        <FormAlert>{error}</FormAlert>
      </div>
    </SlidePanel>
  );
}

function ResultPanel({ tournamentId, match, labels, onClose, onSaved }) {
  const toast = useToast();
  const [setsA, setSetsA] = useState(null);
  const [setsB, setSetsB] = useState(null);
  const [playedAt, setPlayedAt] = useState(clubTodayKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (setsA == null || setsB == null) return setError('Marca los sets de cada lado.');
    if (setsA === setsB)
      return setError('Tiene que haber un ganador: los sets no pueden quedar iguales.');
    setSaving(true);
    setError(null);
    try {
      await tournamentClient.recordMatchResult(tournamentId, match.id, {
        setsWonA: setsA,
        setsWonB: setsB,
        winnerSide: setsA > setsB ? 'A' : 'B',
        playedAt,
      });
      toast({
        title: 'Resultado guardado',
        description: `Pasa ${setsA > setsB ? labels.a : labels.b}`,
        tone: 'success',
      });
      onSaved();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={match != null}
      onClose={onClose}
      title="Registrar resultado"
      description={match ? `${labels.a} vs ${labels.b}` : undefined}
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Guardando…" onClick={save}>
          Guardar resultado
        </Button>
      }
    >
      {match && (
        <div className="space-y-8">
          <NumberChoice label={`Sets de ${labels.a}`} value={setsA} onChange={setSetsA} max={5} />
          <NumberChoice label={`Sets de ${labels.b}`} value={setsB} onChange={setSetsB} max={5} />
          <TextField
            label="Fecha del partido"
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
          />
          <FormAlert>{error}</FormAlert>
        </div>
      )}
    </SlidePanel>
  );
}

// --- Detail ----------------------------------------------------------------

function MatchCard({ match, byId, canRecord, onRecord }) {
  const a = participantLabel(byId.get(match.participantAId));
  const b = participantLabel(byId.get(match.participantBId));
  const done = match.winnerParticipantId != null;
  const isBye = done && match.setsWonA == null;
  const ready = match.participantAId && match.participantBId && !done;
  const line = (label, id) => (
    <p
      className={cn(
        'text-body',
        done && match.winnerParticipantId === id ? 'font-bold text-ink' : 'text-ink-soft',
      )}
    >
      {done && match.winnerParticipantId === id && <span className="sr-only">Ganador: </span>}
      {label ?? 'Por definir'}
    </p>
  );
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      {line(a, match.participantAId)}
      <p className="text-body-sm text-ink-soft">contra</p>
      {line(b, match.participantBId)}
      {isBye && (
        <p className="mt-2 text-body-sm font-semibold text-ink-soft">Pasa directo (sin rival)</p>
      )}
      {done && !isBye && (
        <p className="mt-2 text-body font-semibold text-ink">
          {match.setsWonA}-{match.setsWonB}
        </p>
      )}
      {ready && canRecord && (
        <Button className="mt-3" variant="secondary" onClick={() => onRecord(match, { a, b })}>
          Registrar resultado
        </Button>
      )}
    </div>
  );
}

function Bracket({ participants, matches, canRecord, onRecord }) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const rounds = [...new Set(matches.map((m) => m.round))].sort((x, y) => x - y);
  const roundName = (r) => {
    const fromEnd = rounds.length - rounds.indexOf(r);
    return fromEnd === 1
      ? 'Final'
      : fromEnd === 2
        ? 'Semifinal'
        : fromEnd === 3
          ? 'Cuartos de final'
          : `Ronda ${r}`;
  };
  return (
    <SectionCard
      title="Cuadro"
      async={{ status: 'ready', data: matches }}
      isEmpty={(d) => d.length === 0}
      empty={{ title: 'Todavía no hay cuadro' }}
    >
      {() => (
        // Phones: one round under the other. Wider screens: rounds side by side.
        <div className="flex flex-col gap-6 md:flex-row md:overflow-x-auto md:pb-2">
          {rounds.map((r) => (
            <section key={r} aria-label={roundName(r)} className="md:min-w-[16rem] md:flex-1">
              <h3 className="mb-3 text-lead font-bold text-ink">{roundName(r)}</h3>
              <ul className="space-y-3">
                {matches
                  .filter((m) => m.round === r)
                  .sort((x, y) => x.slot - y.slot)
                  .map((m) => (
                    <li key={m.id}>
                      <MatchCard match={m} byId={byId} canRecord={canRecord} onRecord={onRecord} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TournamentDetail({ tournamentId, isAdmin, canManage, onBack, onListChanged }) {
  const toast = useToast();
  const detail = useAsync(() => tournamentClient.getTournament(tournamentId), [tournamentId]);
  const [panel, setPanel] = useState(null); // 'add' | { match, labels }
  const [confirm, setConfirm] = useState(null); // 'draw' | 'cancel' | { remove }
  const [busy, setBusy] = useState(false);

  const changed = () => {
    detail.reload();
    onListChanged();
  };

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm === 'draw') {
        await tournamentClient.generateDraw(tournamentId);
        toast({ title: 'Sorteo generado', tone: 'success' });
      } else if (confirm === 'cancel') {
        await tournamentClient.cancelTournament(tournamentId);
        toast({ title: 'Torneo cancelado', tone: 'success' });
      } else {
        await tournamentClient.removeParticipant(tournamentId, confirm.remove.id);
        toast({ title: 'Inscripción retirada', tone: 'success' });
      }
      setConfirm(null);
      changed();
    } catch (err) {
      setConfirm(null);
      toast({
        title: 'No pudimos hacer el cambio',
        description: describeTournamentError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  const backButton = (
    <Button variant="ghost" icon={<ArrowLeftIcon />} onClick={onBack}>
      Volver a torneos
    </Button>
  );

  if (detail.status !== 'ready') {
    return (
      <div>
        {backButton}
        <SectionCard title="Torneo" async={detail} errorTitle="No pudimos cargar el torneo">
          {() => null}
        </SectionCard>
      </div>
    );
  }

  const { tournament, participants, matches } = detail.data;
  const isDraft = tournament.status === 'DRAFT';
  const isOpen = isDraft || tournament.status === 'DRAW_GENERATED';

  return (
    <div className="space-y-6">
      {backButton}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-500 p-5 text-white md:p-6">
        <div>
          <h2 className="font-display text-h2 font-bold">{tournament.name}</h2>
          <p className="text-body text-white/90">
            {CATEGORY_LABELS[tournament.category]} · {MODALITY_LABELS[tournament.modality]} ·{' '}
            {participants.length} inscritos
          </p>
        </div>
        <span className="rounded-full bg-white p-1">
          <StatusPill status={tournament.status} />
        </span>
      </div>

      {isDraft && (
        <SectionCard
          title={`Inscritos (${participants.length})`}
          async={{ status: 'ready', data: participants }}
          isEmpty={(d) => d.length === 0}
          empty={{ title: 'Todavía no hay inscritos' }}
          actions={
            <>
              {canManage && (
                <Button icon={<PlusIcon />} onClick={() => setPanel('add')}>
                  {tournament.modality === 'SINGLES' ? 'Inscribir jugador' : 'Inscribir pareja'}
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="secondary"
                  disabled={participants.length < 2}
                  onClick={() => setConfirm('draw')}
                >
                  Generar sorteo
                </Button>
              )}
            </>
          }
        >
          {(list) => (
            <ul className="space-y-3">
              {list.map((p) => (
                <li key={p.id}>
                  <StaffRow
                    title={participantLabel(p)}
                    meta={p.seed ? `Cabeza de serie n.º ${p.seed}` : undefined}
                    actions={
                      canManage ? (
                        <Button variant="ghost" onClick={() => setConfirm({ remove: p })}>
                          Quitar
                        </Button>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
      {isDraft && isAdmin && participants.length < 2 && (
        <p className="text-body text-ink-soft">
          Para generar el sorteo se necesitan al menos 2 inscritos.
        </p>
      )}

      {!isDraft && (
        <Bracket
          participants={participants}
          matches={matches}
          canRecord={canManage && isOpen}
          onRecord={(match, labels) => setPanel({ match, labels })}
        />
      )}

      {isAdmin && isOpen && (
        <Button variant="ghost" onClick={() => setConfirm('cancel')}>
          Cancelar torneo
        </Button>
      )}

      {canManage && (
        <AddParticipantPanel
          key={panel === 'add' ? 'add-open' : 'add'}
          tournament={tournament}
          open={panel === 'add'}
          allowEmail={canManage}
          onClose={() => setPanel(null)}
          onSaved={() => {
            setPanel(null);
            changed();
          }}
        />
      )}
      <ResultPanel
        key={panel?.match?.id ?? 'result'}
        tournamentId={tournamentId}
        match={panel?.match ?? null}
        labels={panel?.labels ?? { a: '', b: '' }}
        onClose={() => setPanel(null)}
        onSaved={() => {
          setPanel(null);
          changed();
        }}
      />
      <ConfirmDialog
        open={confirm != null}
        tone={confirm === 'draw' ? 'primary' : 'danger'}
        title={
          confirm === 'draw'
            ? '¿Generar el sorteo?'
            : confirm === 'cancel'
              ? `¿Cancelar ${tournament.name}?`
              : `¿Quitar a ${participantLabel(confirm?.remove)}?`
        }
        description={
          confirm === 'draw'
            ? `Se arma el cuadro con los ${participants.length} inscritos. Después no se puede inscribir a nadie más.`
            : confirm === 'cancel'
              ? 'El torneo queda cancelado para todos y no se puede reactivar.'
              : 'Sale de la lista de inscritos. Se puede volver a inscribir mientras las inscripciones sigan abiertas.'
        }
        confirmLabel={
          confirm === 'draw'
            ? 'Sí, generar sorteo'
            : confirm === 'cancel'
              ? 'Sí, cancelar torneo'
              : 'Sí, quitar'
        }
        loading={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export function TournamentsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes(ROLE_CODES.ADMINISTRADOR);
  const canManage = STAFF_ROLES.some((r) => roles.includes(r));
  const list = useAsync(() => tournamentClient.listTournaments().then((d) => d.tournaments), []);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Torneos"
        description="Crea torneos, inscribe participantes y registra los resultados del cuadro."
        actions={
          isAdmin && !selectedId ? (
            <Button icon={<PlusIcon />} onClick={() => setCreating(true)}>
              Nuevo torneo
            </Button>
          ) : null
        }
      />

      {selectedId ? (
        <TournamentDetail
          key={selectedId}
          tournamentId={selectedId}
          isAdmin={isAdmin}
          canManage={canManage}
          onBack={() => setSelectedId(null)}
          onListChanged={list.reload}
        />
      ) : (
        <SectionCard
          title="Todos los torneos"
          async={list}
          isEmpty={(d) => d.length === 0}
          empty={{
            title: 'Todavía no hay ningún torneo',
            description: isAdmin ? 'Crea el primero con “Nuevo torneo”.' : undefined,
          }}
          errorTitle="No pudimos cargar los torneos"
        >
          {(items) => (
            <ul className="space-y-3">
              {items.map((t) => (
                <li key={t.id}>
                  <StaffRow
                    title={t.name}
                    badge={<StatusPill status={t.status} />}
                    subtitle={`${CATEGORY_LABELS[t.category] ?? t.category} · ${MODALITY_LABELS[t.modality] ?? t.modality}`}
                    actions={<Button onClick={() => setSelectedId(t.id)}>Abrir</Button>}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {isAdmin && (
        <NewTournamentPanel
          key={creating ? 'new-open' : 'new'}
          open={creating}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
