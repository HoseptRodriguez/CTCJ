import { coachingClient } from '../../api/coachingClient.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { formatDayShort, formatTime } from '../../lib/format.js';
import { describeArea } from '../../lib/performanceRatingLabels.js';
import { useAsync } from '../../lib/useAsync.js';
import { NOTE_TYPE_LABELS, SectionCard } from '../mictcj/shared.jsx';

import { CoachWorkspace, TodayClasses } from './CoachWorkspace.jsx';

function RecentActivity() {
  const activity = useAsync(
    () => coachingClient.getRecentActivity({ limit: 15 }).then((d) => d.activity),
    [],
  );
  return (
    <SectionCard
      title="Lo último del equipo"
      description="Notas y calificaciones de todos los entrenadores. Elige un jugador a la izquierda para ver su seguimiento."
      async={activity}
      isEmpty={(d) => d.length === 0}
      empty={{ title: 'Todavía no hay notas ni calificaciones' }}
    >
      {(items) => (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <p className="text-body text-ink">
                <strong>{item.playerName ?? 'Jugador'}</strong>
                {' · '}
                {item.type === 'NOTE'
                  ? `Nota de ${(NOTE_TYPE_LABELS[item.noteType] ?? item.noteType).toLowerCase()}${item.area ? ` (${describeArea(item.area)})` : ''}`
                  : `${describeArea(item.area)}: ${item.rating} de 10`}
              </p>
              <p className="text-body-sm text-ink-soft">
                {formatDayShort(item.at)} · {formatTime(item.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function CoachDashboard() {
  return (
    <div>
      <PageHeader
        title="Clases de hoy"
        description="Tus clases, y las notas y el rendimiento de cada jugador."
      />
      <CoachWorkspace aside={<TodayClasses />} empty={<RecentActivity />} />
    </div>
  );
}
