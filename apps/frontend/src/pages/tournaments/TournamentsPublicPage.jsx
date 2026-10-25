import { Link } from 'react-router-dom';

import { tournamentClient } from '../../api/tournamentClient.js';
import { BrochureTitle } from '../../components/brochure/Brochure.jsx';
import { TrophyIcon } from '../../components/icons/TrophyIcon.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAsync } from '../../lib/useAsync.js';

import { CATEGORY, MODALITY, PUBLIC_STATUS, datesText } from './publicTournamentLabels.js';

const GROUPS = [
  { status: 'OPEN', title: 'Inscripciones abiertas' },
  { status: 'IN_PROGRESS', title: 'En curso' },
  { status: 'FINISHED', title: 'Finalizados' },
];

/** /torneos -- public, no login. */
export function TournamentsPublicPage() {
  useDocumentTitle('Torneos');
  const data = useAsync(() => tournamentClient.listPublic().then((d) => d.tournaments), []);

  return (
    <>
      <section
        aria-labelledby="torneos-titulo"
        className="relative overflow-hidden bg-navy-500 text-white"
      >
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-16 w-2/3 bg-lime [clip-path:polygon(18%_100%,100%_0,100%_100%)] md:h-24"
        />
        <div className="relative mx-auto max-w-container px-4 py-14 md:px-8 md:py-20">
          <p className="text-lead font-semibold text-lime">Club de Tenis Ciudad Jardín</p>
          <BrochureTitle
            as="h1"
            id="torneos-titulo"
            tone="navy"
            className="mt-3 text-white md:text-[3.5rem]"
          >
            Torneos
          </BrochureTitle>
          <p className="mt-5 max-w-prose text-lead text-white/90">
            Inscripciones abiertas, cuadros y resultados de los torneos del club.
          </p>
        </div>
      </section>

      <div className="bg-page">
        <div className="mx-auto max-w-container space-y-12 px-4 py-14 md:px-8">
          {data.status === 'loading' || data.status === 'idle' ? (
            <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : data.status === 'error' ? (
            <ErrorState title="No pudimos cargar los torneos" onRetry={data.reload} />
          ) : data.data.length === 0 ? (
            <EmptyState
              icon={<TrophyIcon />}
              title="Todavía no hay torneos publicados"
              description="Cuando el club abra la inscripción a un torneo, aparecerá aquí."
            />
          ) : (
            GROUPS.map((g) => {
              const list = data.data.filter((t) => t.status === g.status);
              if (list.length === 0) return null;
              return (
                <section key={g.status} aria-labelledby={`grupo-${g.status}`}>
                  <BrochureTitle id={`grupo-${g.status}`}>{g.title}</BrochureTitle>
                  <ul className="mt-6 grid gap-4 md:grid-cols-2">
                    {list.map((t) => (
                      <li key={t.id}>
                        <Link
                          to={`/torneos/${t.id}`}
                          className="focus-ring group block h-full rounded-xl border-2 border-line bg-surface p-6 shadow-sm transition-colors duration-fast hover:border-navy-500"
                        >
                          <StatusBadge
                            status={PUBLIC_STATUS[t.status].badge}
                            label={PUBLIC_STATUS[t.status].label}
                          />
                          <span className="mt-3 block font-display text-h3 font-bold text-ink">
                            {t.name}
                          </span>
                          <span className="mt-1 block text-body text-ink-soft">
                            Categoría {CATEGORY[t.category] ?? t.category} ·{' '}
                            {MODALITY[t.modality] ?? t.modality}
                          </span>
                          {datesText(t.startsOn, t.endsOn) && (
                            <span className="mt-1 block text-body text-ink-soft">
                              {datesText(t.startsOn, t.endsOn)}
                            </span>
                          )}
                          <span className="mt-4 block font-semibold text-navy-500 group-hover:underline">
                            Ver cuadros y resultados →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
