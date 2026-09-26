import { NoteIcon } from '../../components/icons/NoteIcon.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';

import { CoachWorkspace, TodayClasses } from './CoachWorkspace.jsx';

export function CoachNotesPage() {
  return (
    <div>
      <PageHeader
        title="Notas y rendimiento"
        description="Busca un jugador para escribirle una nota o calificar sus habilidades. Las notas de “Solo entrenadores” nunca las ve el jugador."
      />
      <CoachWorkspace
        aside={<TodayClasses />}
        empty={
          <EmptyState
            icon={<NoteIcon />}
            title="Elige un jugador"
            description="Escribe su nombre en “Buscar jugador” para ver sus notas y su rendimiento."
          />
        }
      />
    </div>
  );
}
