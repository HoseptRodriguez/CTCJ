import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { tournamentClient } from '../../api/tournamentClient.js';
import { BrochureTitle } from '../../components/brochure/Brochure.jsx';
import { TrophyIcon } from '../../components/icons/TrophyIcon.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { cn } from '../../components/ui/cn.js';
import { useAsync } from '../../lib/useAsync.js';

import {
  CATEGORY,
  MATCH_TIME,
  MODALITY,
  PUBLIC_STATUS,
  datesText,
} from './publicTournamentLabels.js';

const sideName = (side) => (side ? side.names.join(' y ') : null);

/** What a screen reader hears for one match (and what sighted people see). */
export function matchSummary(m) {
  const a = sideName(m.a);
  const b = sideName(m.b);
  if (m.bye) return `${sideName(m.winner === 'A' ? m.a : m.b)} pasa directo a la siguiente ronda.`;
  if (!a || !b) return 'Por definir: espera el resultado de la ronda anterior.';
  if (m.winner) {
    const winner = m.winner === 'A' ? a : b;
    return `${a} contra ${b}: ganó ${winner}${m.score ? `, ${m.score} en sets` : ''}.`;
  }
  return `${a} contra ${b}: por jugar.`;
}

function Side({ side, won, lost }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg px-3 py-2',
        won ? 'bg-lime/40 font-bold text-ink' : 'text-ink',
        lost && 'text-ink-soft',
      )}
    >
      <span className="min-w-0 break-words">
        {side ? (
          <>
            {side.seed ? (
              <span className="mr-1 text-body-sm text-ink-soft">({side.seed})</span>
            ) : null}
            {sideName(side)}
          </>
        ) : (
          <span className="italic text-ink-soft">Por definir</span>
        )}
      </span>
      {won && (
        <span className="shrink-0 rounded-full bg-navy-500 px-2 text-body-sm font-semibold text-white">
          Ganó
        </span>
      )}
    </div>
  );
}

function Match({ match }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-2 shadow-sm">
      {/* One sentence for screen readers; the visual card is hidden from them. */}
      <p className="sr-only">{matchSummary(match)}</p>
      <div aria-hidden="true">
        <Side side={match.a} won={match.winner === 'A'} lost={match.winner === 'B'} />
        <Side side={match.b} won={match.winner === 'B'} lost={match.winner === 'A'} />
        {(match.score || match.scheduledAt || match.courtName || match.bye) && (
          <p className="px-3 pt-1 text-body-sm text-ink-soft">
            {match.bye && 'Pasa directo'}
            {match.score && `Sets ${match.score}`}
            {!match.score && match.scheduledAt && MATCH_TIME.format(new Date(match.scheduledAt))}
            {!match.score && match.courtName && ` · ${match.courtName}`}
          </p>
        )}
      </div>
      {!match.score && (match.scheduledAt || match.courtName) && (
        <p className="sr-only">
          {match.scheduledAt && `Se juega ${MATCH_TIME.format(new Date(match.scheduledAt))}. `}
          {match.courtName && `Cancha: ${match.courtName}.`}
        </p>
      )}
    </li>
  );
}

/** /torneos/:id -- public: dates, category, brackets and results. Names only. */
export function TournamentPublicPage() {
  const { id } = useParams();
  const location = useLocation();
  const data = useAsync(() => tournamentClient.getPublic(id), [id]);
  const t = data.data?.tournament;
  useDocumentTitle(t ? t.name : 'Torneo');

  // The emails link to "#cuadros": go there once the brackets are shown.
  useEffect(() => {
    if (data.status === 'ready' && location.hash === '#cuadros') {
      document.getElementById('cuadros')?.scrollIntoView();
    }
  }, [data.status, location.hash]);

  if (data.status === 'loading' || data.status === 'idle') {
    return (
      <div className="mx-auto max-w-container space-y-4 px-4 py-14 md:px-8" aria-busy="true">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (data.status === 'error') {
    return (
      <div className="mx-auto max-w-container px-4 py-14 md:px-8">
        <ErrorState
          title="No encontramos este torneo"
          description="Puede que todavía no esté publicado. Mira la lista de torneos."
          onRetry={data.reload}
        />
        <Link
          to="/torneos"
          className="focus-ring mt-6 inline-block rounded font-semibold text-navy-500 underline"
        >
          Ver todos los torneos
        </Link>
      </div>
    );
  }

  const { participants, rounds } = data.data;
  const dates = datesText(t.startsOn, t.endsOn);
  return (
    <>
      <section
        aria-labelledby="torneo-titulo"
        className="relative overflow-hidden bg-navy-500 text-white"
      >
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-16 w-2/3 bg-lime [clip-path:polygon(18%_100%,100%_0,100%_100%)] md:h-24"
        />
        <div className="relative mx-auto max-w-container px-4 py-14 md:px-8 md:py-16">
          <p className="text-lead font-semibold text-lime">
            <Link to="/torneos" className="focus-ring rounded underline underline-offset-4">
              Torneos
            </Link>
          </p>
          <BrochureTitle
            as="h1"
            id="torneo-titulo"
            tone="navy"
            className="mt-3 text-white md:text-[3rem]"
          >
            {t.name}
          </BrochureTitle>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-lead text-white/90">
            <StatusBadge
              status={PUBLIC_STATUS[t.status].badge}
              label={PUBLIC_STATUS[t.status].label}
            />
            <span>
              Categoría {CATEGORY[t.category] ?? t.category} · {MODALITY[t.modality] ?? t.modality}
            </span>
            {dates && <span>{dates}</span>}
          </div>
          {t.champion && (
            <p className="mt-6 flex items-center gap-3 text-lead font-semibold text-lime">
              <TrophyIcon className="h-7 w-7" aria-hidden="true" />
              Campeón: {sideName(t.champion)}
            </p>
          )}
        </div>
      </section>

      <div className="bg-page">
        <div className="mx-auto max-w-container space-y-12 px-4 py-14 md:px-8">
          <section aria-labelledby="cuadros-titulo" id="cuadros" className="scroll-mt-24">
            <BrochureTitle id="cuadros-titulo">Cuadros</BrochureTitle>
            {rounds.length === 0 ? (
              <EmptyState
                className="mt-6"
                title="Los cuadros aún no se han publicado"
                description="Cuando cierre la inscripción, el club publicará los cuadros aquí."
              />
            ) : (
              <>
                <p className="mt-4 text-body text-ink-soft md:hidden">
                  Desliza hacia los lados para ver todas las rondas.
                </p>
                {/* Scrolls sideways inside its own box on phones; focusable so
                    the keyboard can scroll it too. */}
                <div
                  role="region"
                  aria-label="Cuadros por ronda"
                  tabIndex={0}
                  className="focus-ring mt-4 overflow-x-auto rounded-xl pb-4"
                >
                  <ol className="flex min-w-max gap-4">
                    {rounds.map((r) => (
                      <li key={r.round} className="w-72 shrink-0">
                        <h3 className="mb-3 font-display text-h3 font-bold uppercase tracking-wide text-navy-500">
                          {r.name}
                        </h3>
                        <ol className="flex flex-col justify-around gap-3" aria-label={r.name}>
                          {r.matches.map((m) => (
                            <Match key={m.id} match={m} />
                          ))}
                        </ol>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </section>

          <section aria-labelledby="inscritos-titulo">
            <BrochureTitle id="inscritos-titulo">Inscritos</BrochureTitle>
            {participants.length === 0 ? (
              <p className="mt-4 text-body text-ink">
                Todavía no hay inscritos. Pregunta en recepción cómo inscribirte.
              </p>
            ) : (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-surface px-4 py-3 text-body text-ink shadow-sm"
                  >
                    {p.seed ? <span className="mr-2 text-ink-soft">Cabeza {p.seed}</span> : null}
                    {sideName(p)}
                    <span className="block text-body-sm text-ink-soft">
                      Categoría {CATEGORY[t.category] ?? t.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
