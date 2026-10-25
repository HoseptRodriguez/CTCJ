import { Outlet } from 'react-router-dom';

import { LockIcon } from '../../components/icons/LockIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

import { useMyCtcj } from './MyCtcjContext.jsx';

/**
 * Mi progreso, Ranking and Comunidad are for club players. Someone without
 * the JUGADOR role who reaches them (old link, typed URL) is told how to
 * become one instead of seeing an empty page. The server enforces it too.
 */
export function RequireJugador() {
  const { isJugador } = useMyCtcj();
  if (isJugador) return <Outlet />;
  return (
    <EmptyState
      icon={<LockIcon />}
      title="Esta sección es para jugadores del club"
      description="Pide ser jugador desde Inicio. Cuando el club te apruebe, verás aquí tu progreso, el ranking y la comunidad."
      action={<Button to="/mi-ctcj">Ir a Inicio</Button>}
    />
  );
}
