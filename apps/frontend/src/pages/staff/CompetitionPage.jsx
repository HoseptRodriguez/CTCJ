import { ROLE_CODES } from '@ctcj/shared';
import { useEffect, useState } from 'react';

import { competitionClient } from '../../api/competitionClient.js';
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
import { describeCompetitionError } from '../../lib/competitionErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import { CATEGORY_LABELS, DATE_MEDIUM, MODALITY_LABELS, SectionCard } from '../mictcj/shared.jsx';

import { NumberChoice, ParticipantSlot } from './matchInputs.jsx';
import { FormAlert, ReasonDialog, StaffRow } from './staffShared.jsx';

// Same role sets the backend enforces on these routes.
const RECORD_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION, ROLE_CODES.ENTRENADOR];
const LOOKUP_ROLES = RECORD_ROLES;

const dateOnly = (key) => DATE_MEDIUM.format(new Date(`${String(key).slice(0, 10)}T12:00:00Z`));
const sideName = (people) =>
  people
    .map((p) => (p.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : 'Jugador'))
    .join(' y ');

function RecordMatchPanel({ open, onClose, seasonId, category, modality, allowEmail, onSaved }) {
  const toast = useToast();
  const slots = modality === 'SINGLES' ? 1 : 2;
  const [sideA, setSideA] = useState(() => Array(slots).fill(null));
  const [sideB, setSideB] = useState(() => Array(slots).fill(null));
  const [setsA, setSetsA] = useState(null);
  const [setsB, setSetsB] = useState(null);
  const [playedAt, setPlayedAt] = useState(clubTodayKey);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    const everyone = [...sideA, ...sideB];
    if (everyone.some((p) => !p)) return setError('Elige a todos los jugadores.');
    if (new Set(everyone.map((p) => p.id)).size !== everyone.length)
      return setError('Un jugador no puede estar dos veces.');
    if (setsA == null || setsB == null) return setError('Marca los sets de cada lado.');
    if (setsA === setsB)
      return setError('Tiene que haber un ganador: los sets no pueden quedar iguales.');
    setSaving(true);
    setError(null);
    try {
      await competitionClient.recordMatch({
        seasonId,
        category,
        modality,
        participantsA: sideA.map((p) => p.id),
        participantsB: sideB.map((p) => p.id),
        winnerSide: setsA > setsB ? 'A' : 'B',
        setsWonA: setsA,
        setsWonB: setsB,
        playedAt,
        notes: notes.trim() || undefined,
      });
      toast({
        title: 'Resultado registrado',
        description: `${sideName(sideA)} ${setsA}-${setsB} ${sideName(sideB)}`,
        tone: 'success',
      });
      onSaved();
    } catch (err) {
      setError(describeCompetitionError(err));
    } finally {
      setSaving(false);
    }
  }

  const slotLabel = (side, i) =>
    slots === 1 ? `Jugador del lado ${side}` : `Jugador ${i + 1} del lado ${side}`;
  const setAt = (setter) => (i) => (p) => setter((prev) => prev.map((x, j) => (j === i ? p : x)));

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Registrar resultado"
      description={`${CATEGORY_LABELS[category]} · ${MODALITY_LABELS[modality]}`}
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Guardando…" onClick={save}>
          Guardar resultado
        </Button>
      }
    >
      <div className="space-y-8">
        {[
          ['A', sideA, setAt(setSideA), setsA, setSetsA],
          ['B', sideB, setAt(setSideB), setsB, setSetsB],
        ].map(([side, list, setOne, sets, setSets]) => (
          <section
            key={side}
            aria-label={`Lado ${side}`}
            className="space-y-4 rounded-xl bg-page p-4"
          >
            <h3 className="text-lead font-bold text-ink">Lado {side}</h3>
            {list.map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <ParticipantSlot
                key={i}
                label={slotLabel(side, i)}
                value={p}
                onChange={setOne(i)}
                allowEmail={allowEmail}
              />
            ))}
            <NumberChoice
              label={`Sets ganados por el lado ${side}`}
              value={sets}
              onChange={setSets}
              max={5}
            />
          </section>
        ))}
        <TextField
          label="Fecha del partido"
          type="date"
          value={playedAt}
          onChange={(e) => setPlayedAt(e.target.value)}
        />
        <TextField
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
        />
        <FormAlert>{error}</FormAlert>
      </div>
    </SlidePanel>
  );
}

function NewSeasonPanel({ open, onClose, onSaved }) {
  const toast = useToast();
  const year = Number(clubTodayKey().slice(0, 4));
  const [seasonNumber, setSeasonNumber] = useState('1');
  const [name, setName] = useState(`Temporada 1 · ${year}`);
  const [startDate, setStartDate] = useState(clubTodayKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!name.trim()) return setError('Escribe el nombre de la temporada.');
    setSaving(true);
    setError(null);
    try {
      await competitionClient.createSeason({
        name: name.trim(),
        year: Number(startDate.slice(0, 4)) || year,
        seasonNumber: Number(seasonNumber),
        startDate,
      });
      toast({ title: 'Temporada creada', description: name.trim(), tone: 'success' });
      onSaved();
    } catch (err) {
      setError(describeCompetitionError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Nueva temporada"
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Creando…" onClick={save}>
          Crear temporada
        </Button>
      }
    >
      <div className="space-y-6">
        <SegmentedControl
          label="Temporada del año"
          value={seasonNumber}
          onChange={(v) => {
            setSeasonNumber(v);
            setName(`Temporada ${v} · ${startDate.slice(0, 4) || year}`);
          }}
          options={[
            { value: '1', label: 'Primera' },
            { value: '2', label: 'Segunda' },
          ]}
        />
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <TextField
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <FormAlert>{error}</FormAlert>
      </div>
    </SlidePanel>
  );
}

function Standings({ seasonId, category, modality, version }) {
  const standings = useAsync(
    () => competitionClient.getStandings({ seasonId, category, modality }).then((d) => d.standings),
    [seasonId, category, modality, version],
  );
  return (
    <SectionCard
      title="Tabla"
      async={standings}
      isEmpty={(r) => r.length === 0}
      empty={{ title: 'Todavía no hay partidos en esta categoría' }}
    >
      {(rows) => (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.playerId}
              className={cn(
                'flex items-center gap-3 rounded-lg p-3',
                row.qualifiesForMasters ? 'bg-status-ok-bg' : 'bg-page',
              )}
            >
              <span className="w-10 text-center font-display text-h3 font-bold text-ink">
                {row.rank}
              </span>
              <span className="min-w-0 flex-1 text-body text-ink">
                {row.playerName ?? 'Jugador'}
                {row.qualifiesForMasters && (
                  <span className="ml-2 text-body-sm font-semibold text-status-ok-fg">Masters</span>
                )}
              </span>
              <span className="text-right text-body">
                <strong>{row.points}</strong> pts · {row.matchesPlayed} PJ
              </span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function Matches({ seasonId, category, modality, version, canRecord, onChanged }) {
  const toast = useToast();
  const matches = useAsync(
    () => competitionClient.listMatches({ seasonId, category, modality }).then((d) => d.matches),
    [seasonId, category, modality, version],
  );
  const [voiding, setVoiding] = useState(null);

  return (
    <>
      <SectionCard
        title="Partidos"
        async={matches}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'Sin partidos registrados todavía' }}
      >
        {(list) => (
          <ul className="space-y-3">
            {list.map((m) => {
              const isVoid = m.status === 'VOID';
              const winner = m.winnerSide === 'A' ? m.participantsA : m.participantsB;
              return (
                <li key={m.id}>
                  <StaffRow
                    className={isVoid ? 'opacity-80' : undefined}
                    title={`${sideName(m.participantsA)} vs ${sideName(m.participantsB)}`}
                    badge={isVoid ? <StatusBadge status="suspendida" label="Anulado" /> : null}
                    subtitle={`${m.setsWonA}-${m.setsWonB} · ganó ${sideName(winner)}`}
                    meta={dateOnly(m.playedAt)}
                    actions={
                      canRecord && !isVoid ? (
                        <Button variant="ghost" onClick={() => setVoiding(m)}>
                          Anular
                        </Button>
                      ) : null
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      <ReasonDialog
        open={voiding != null}
        title="¿Anular el partido?"
        description={
          voiding
            ? `${sideName(voiding.participantsA)} vs ${sideName(voiding.participantsB)}. Deja de contar para la tabla y no se puede deshacer.`
            : ''
        }
        confirmLabel="Sí, anular partido"
        describeError={describeCompetitionError}
        onConfirm={async (reason) => {
          await competitionClient.voidMatch(voiding.id, reason);
          toast({ title: 'Partido anulado', tone: 'success' });
          setVoiding(null);
          onChanged();
        }}
        onCancel={() => setVoiding(null)}
      />
    </>
  );
}

export function CompetitionPage() {
  const toast = useToast();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes(ROLE_CODES.ADMINISTRADOR);
  const canRecord = RECORD_ROLES.some((r) => roles.includes(r));
  const allowEmail = LOOKUP_ROLES.some((r) => roles.includes(r));

  const seasons = useAsync(() => competitionClient.listSeasons().then((d) => d.seasons), []);
  const [seasonId, setSeasonId] = useState('');
  const [category, setCategory] = useState('SEGUNDA');
  const [modality, setModality] = useState('SINGLES');
  const [version, setVersion] = useState(0);
  const [panel, setPanel] = useState(null); // 'season' | 'match'
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (seasons.status !== 'ready') return;
    if (seasonId && seasons.data.some((s) => s.id === seasonId)) return;
    setSeasonId((seasons.data.find((s) => s.status === 'OPEN') ?? seasons.data[0])?.id ?? '');
  }, [seasons.status, seasons.data, seasonId]);

  const season = seasons.data?.find((s) => s.id === seasonId);
  const bump = () => setVersion((v) => v + 1);

  async function closeSeason() {
    setBusy(true);
    try {
      await competitionClient.closeSeason(seasonId);
      toast({ title: 'Temporada cerrada', tone: 'success' });
      setClosing(false);
      seasons.reload();
    } catch (err) {
      toast({
        title: 'No pudimos cerrar la temporada',
        description: describeCompetitionError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ranking y partidos"
        description="Temporadas, tabla de posiciones y resultados del ranking interno."
        actions={
          <>
            {canRecord && season?.status === 'OPEN' && (
              <Button icon={<PlusIcon />} onClick={() => setPanel('match')}>
                Registrar resultado
              </Button>
            )}
            {isAdmin && (
              <Button variant="secondary" onClick={() => setPanel('season')}>
                Nueva temporada
              </Button>
            )}
          </>
        }
      />

      <SectionCard
        title="Temporada"
        async={seasons}
        isEmpty={(d) => d.length === 0}
        empty={{
          title: 'Todavía no hay ninguna temporada',
          description: isAdmin
            ? 'Crea la primera con “Nueva temporada”.'
            : 'Un administrador debe crear la primera temporada.',
        }}
        className="mb-8"
      >
        {(list) => (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <SelectField
              label="Temporada"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              options={list.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.status === 'OPEN' ? 'abierta' : 'cerrada'})`,
              }))}
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
            {isAdmin && season?.status === 'OPEN' && (
              <Button variant="ghost" onClick={() => setClosing(true)}>
                Cerrar temporada
              </Button>
            )}
          </div>
        )}
      </SectionCard>

      {seasonId && (
        <div className="grid gap-8 xl:grid-cols-2">
          <Standings
            seasonId={seasonId}
            category={category}
            modality={modality}
            version={version}
          />
          <Matches
            seasonId={seasonId}
            category={category}
            modality={modality}
            version={version}
            canRecord={canRecord}
            onChanged={bump}
          />
        </div>
      )}

      <RecordMatchPanel
        key={`${panel}-${seasonId}-${category}-${modality}`}
        open={panel === 'match'}
        onClose={() => setPanel(null)}
        seasonId={seasonId}
        category={category}
        modality={modality}
        allowEmail={allowEmail}
        onSaved={() => {
          setPanel(null);
          bump();
        }}
      />
      {isAdmin && (
        <NewSeasonPanel
          key={panel === 'season' ? 'season-open' : 'season'}
          open={panel === 'season'}
          onClose={() => setPanel(null)}
          onSaved={() => {
            setPanel(null);
            seasons.reload();
          }}
        />
      )}
      <ConfirmDialog
        open={closing}
        title={`¿Cerrar ${season?.name ?? 'la temporada'}?`}
        description="No se podrán registrar más partidos en ella y la tabla queda final. No se puede reabrir."
        confirmLabel="Sí, cerrar temporada"
        loading={busy}
        onConfirm={closeSeason}
        onCancel={() => setClosing(false)}
      />
    </div>
  );
}
