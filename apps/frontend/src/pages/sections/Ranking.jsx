import { useEffect, useState } from 'react';

import { competitionClient } from '../../api/competitionClient.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { cn } from '../../components/ui/cn.js';
import { Section } from '../../components/ui/Section.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeCompetitionError } from '../../lib/competitionErrorMessages.js';

// Segunda-Quinta (there is no "Primera") are confirmed real category names
// per the club's own Master Requirements doc. This section must never
// render fake/demo player rows -- see Ranking.test.jsx.
const CATEGORIES = [
  { code: 'SEGUNDA', label: 'Segunda categoría' },
  { code: 'TERCERA', label: 'Tercera categoría' },
  { code: 'CUARTA', label: 'Cuarta categoría' },
  { code: 'QUINTA', label: 'Quinta categoría' },
];
const MODALITIES = [
  { code: 'SINGLES', value: 'singles', label: 'Singles' },
  { code: 'DOBLES', value: 'dobles', label: 'Dobles' },
];

function SeasonLabel(season) {
  return `${season.name}${season.status === 'CLOSED' ? ' (cerrada)' : ''}`;
}

export function Ranking() {
  const { status } = useAuth();
  const [modality, setModality] = useState(MODALITIES[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [seasons, setSeasons] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [standings, setStandings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    competitionClient
      .listSeasons()
      .then((data) => {
        if (cancelled) return;
        setSeasons(data.seasons);
        const defaultSeason = data.seasons.find((s) => s.status === 'OPEN') ?? data.seasons[0];
        if (defaultSeason) setSelectedSeasonId(defaultSeason.id);
      })
      .catch(() => {
        if (!cancelled) setSeasons([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !selectedSeasonId) {
      setStandings(null);
      return undefined;
    }
    let cancelled = false;
    setError(null);
    competitionClient
      .getStandings({
        seasonId: selectedSeasonId,
        category: category.code,
        modality: modality.code,
      })
      .then((data) => {
        if (!cancelled) setStandings(data.standings);
      })
      .catch((err) => {
        if (!cancelled) setError(describeCompetitionError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [status, selectedSeasonId, category, modality]);

  const hasAnySeason = seasons != null && seasons.length > 0;

  return (
    <Section
      id="ranking"
      background="inverse"
      heading={{
        eyebrow: 'Competición CTCJ',
        title: 'Ranking interno del club',
        lede: 'Singles y dobles, cuatro categorías, dos temporadas al año y un Master al cierre de cada una. Sigue tu posición, tu camino al Master y la historia competitiva del club.',
      }}
    >
      <div className="mt-10 rounded-lg bg-canvas p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div className="flex gap-2" role="tablist" aria-label="Modalidad">
            {MODALITIES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={modality.value === m.value}
                onClick={() => setModality(m)}
                className={cn(
                  'rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors duration-fast',
                  modality.value === m.value
                    ? 'bg-navy-500 text-on-inverse'
                    : 'bg-sunken text-secondary',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-secondary">
            Temporada
            <select
              className="rounded-md border border-neutral-300 bg-canvas px-3 py-1.5 text-sm"
              disabled={!hasAnySeason}
              value={hasAnySeason ? selectedSeasonId : 'none'}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
            >
              {hasAnySeason ? (
                seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {SeasonLabel(season)}
                  </option>
                ))
              ) : (
                <option value="none">Sin temporada activa</option>
              )}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.code}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category.code === cat.code}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-fast',
                category.code === cat.code
                  ? 'border-navy-500 bg-navy-50 text-primary'
                  : 'border-neutral-200 text-secondary',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {!hasAnySeason ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-raised p-10 text-center">
            <Badge />
            <p className="mt-4 font-display text-lg font-semibold text-primary">
              Todavía no hay una temporada activa
            </p>
            <p className="mx-auto mt-2 max-w-md text-secondary">
              El ranking se activa con la primera temporada del club. Vuelve pronto para ver la
              tabla de {category.label.toLowerCase()} en{' '}
              {modality.value === 'singles' ? 'singles' : 'dobles'}.
            </p>
          </div>
        ) : null}

        {hasAnySeason && status !== 'authenticated' ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-raised p-10 text-center">
            <p className="font-display text-lg font-semibold text-primary">
              Inicia sesión para ver la tabla de posiciones
            </p>
            <p className="mx-auto mt-2 max-w-md text-secondary">
              La tabla de posiciones es visible solo para miembros con sesión iniciada.
            </p>
            <Button to="/login" variant="primary" className="mt-4">
              Iniciar sesión
            </Button>
          </div>
        ) : null}

        {hasAnySeason && status === 'authenticated' ? (
          <div className="mt-8">
            {error ? <p className="text-sm text-error">{error}</p> : null}
            {!error && standings === null ? (
              <p className="text-sm text-secondary">Cargando tabla de posiciones...</p>
            ) : null}
            {!error && standings?.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-300 bg-raised p-6 text-center text-secondary">
                Sin partidos registrados en esta categoría todavía.
              </p>
            ) : null}
            {!error && standings?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className="pb-2 font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
                        #
                      </th>
                      <th className="pb-2 font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
                        Jugador
                      </th>
                      <th className="pb-2 text-right font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
                        Puntos
                      </th>
                      <th className="pb-2 text-right font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
                        Dif. sets
                      </th>
                      <th className="pb-2 text-right font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
                        Master
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.playerId} className="border-t border-neutral-200">
                        <td className="py-2 text-secondary">{row.rank}</td>
                        <td className="py-2 font-semibold text-primary">
                          {row.playerName ?? 'Jugador'}
                        </td>
                        <td className="py-2 text-right text-secondary">{row.points}</td>
                        <td className="py-2 text-right text-secondary">{row.setDiff}</td>
                        <td className="py-2 text-right">
                          {row.qualifiesForMasters ? (
                            <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                              Clasifica
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
