import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { competitionClient } from '../../api/competitionClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { CompetitionPage } from './CompetitionPage.jsx';

vi.mock('../../api/competitionClient.js', () => ({
  competitionClient: {
    listSeasons: vi.fn(),
    createSeason: vi.fn(),
    closeSeason: vi.fn(),
    getStandings: vi.fn(),
    listMatches: vi.fn(),
    recordMatch: vi.fn(),
    voidMatch: vi.fn(),
  },
}));
vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn(), searchPlayers: vi.fn() },
}));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

const OPEN_SEASON = {
  id: 'season-1',
  name: 'Temporada 1 · 2026',
  year: 2026,
  seasonNumber: 1,
  status: 'OPEN',
};
const ANA = { id: 'p1', firstName: 'Ana', lastName: 'Gomez' };
const BETO = { id: 'p2', firstName: 'Beto', lastName: 'Ruiz' };
const MATCH = {
  id: 'm1',
  participantsA: [ANA],
  participantsB: [BETO],
  setsWonA: 2,
  setsWonB: 1,
  winnerSide: 'A',
  playedAt: '2026-09-20',
  status: 'CONFIRMED',
};

function renderAs(roles) {
  useAuth.mockReturnValue({ user: { id: 'staff-1', roles: ['USUARIO', ...roles] } });
  return render(
    <ToastProvider>
      <CompetitionPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
  competitionClient.getStandings.mockResolvedValue({
    standings: [
      {
        playerId: 'p1',
        playerName: 'Ana Gomez',
        rank: 1,
        points: 3,
        matchesPlayed: 1,
        qualifiesForMasters: true,
      },
    ],
  });
  competitionClient.listMatches.mockResolvedValue({ matches: [MATCH] });
  membershipClient.searchPlayers.mockImplementation((q) =>
    Promise.resolve({
      players: [ANA, BETO].filter((p) => p.firstName.toLowerCase().startsWith(q.toLowerCase())),
    }),
  );
});

describe('CompetitionPage (Ranking y partidos)', () => {
  it('without seasons, an admin is told to create one', async () => {
    competitionClient.listSeasons.mockResolvedValue({ seasons: [] });
    renderAs(['ADMINISTRADOR']);
    expect(await screen.findByText('Todavía no hay ninguna temporada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva temporada' })).toBeInTheDocument();
  });

  it('shows the table and the matches of the open season', async () => {
    renderAs(['RECEPCION']);
    expect(await screen.findByText('Masters')).toBeInTheDocument();
    expect(await screen.findByText('Ana Gomez vs Beto Ruiz')).toBeInTheDocument();
    expect(screen.getByText('2-1 · ganó Ana Gomez')).toBeInTheDocument();
    expect(competitionClient.getStandings).toHaveBeenCalledWith({
      seasonId: 'season-1',
      category: 'SEGUNDA',
      modality: 'SINGLES',
    });
  });

  it('Recepción can record but not create or close seasons', async () => {
    renderAs(['RECEPCION']);
    expect(await screen.findByRole('button', { name: 'Registrar resultado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva temporada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar temporada' })).not.toBeInTheDocument();
  });

  it('a physiotherapist only looks: no record or void controls (the backend would refuse)', async () => {
    renderAs(['FISIOTERAPEUTA']);
    await screen.findByText('Ana Gomez vs Beto Ruiz');
    expect(screen.queryByRole('button', { name: 'Registrar resultado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  });

  it('records a singles result choosing players by name and sets by buttons', async () => {
    competitionClient.recordMatch.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ENTRENADOR']);
    await user.click(await screen.findByRole('button', { name: 'Registrar resultado' }));
    const panel = await screen.findByRole('dialog', { name: 'Registrar resultado' });

    await user.type(within(panel).getByLabelText('Jugador del lado A'), 'Ana');
    await user.click(
      await within(panel).findByRole('button', { name: 'Ana Gomez' }, { timeout: 2000 }),
    );
    await user.type(within(panel).getByLabelText('Jugador del lado B'), 'Beto');
    await user.click(
      await within(panel).findByRole('button', { name: 'Beto Ruiz' }, { timeout: 2000 }),
    );

    const setsA = within(panel).getByRole('group', { name: 'Sets ganados por el lado A' });
    const setsB = within(panel).getByRole('group', { name: 'Sets ganados por el lado B' });
    await user.click(within(setsA).getByRole('radio', { name: '2' }));
    await user.click(within(setsB).getByRole('radio', { name: '2' }));
    await user.click(within(panel).getByRole('button', { name: 'Guardar resultado' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent('Tiene que haber un ganador');

    await user.click(within(setsB).getByRole('radio', { name: '0' }));
    await user.click(within(panel).getByRole('button', { name: 'Guardar resultado' }));
    await waitFor(() =>
      expect(competitionClient.recordMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          seasonId: 'season-1',
          category: 'SEGUNDA',
          modality: 'SINGLES',
          participantsA: ['p1'],
          participantsB: ['p2'],
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
        }),
      ),
    );
  });

  it('voiding a match asks for a reason', async () => {
    competitionClient.voidMatch.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await user.click(await screen.findByRole('button', { name: 'Anular' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Anular el partido?' });
    await user.type(within(dialog).getByLabelText('Motivo'), 'Error de digitación');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, anular partido' }));
    await waitFor(() =>
      expect(competitionClient.voidMatch).toHaveBeenCalledWith('m1', 'Error de digitación'),
    );
  });

  it('admin closes the season after confirming', async () => {
    competitionClient.closeSeason.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await user.click(await screen.findByRole('button', { name: 'Cerrar temporada' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Cerrar Temporada 1 · 2026?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cerrar temporada' }));
    await waitFor(() => expect(competitionClient.closeSeason).toHaveBeenCalledWith('season-1'));
  });
});
