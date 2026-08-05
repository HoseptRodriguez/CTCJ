import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { competitionClient } from '../../api/competitionClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { CompetitionPage } from './CompetitionPage.jsx';

vi.mock('../../api/competitionClient.js', () => ({
  competitionClient: {
    listSeasons: vi.fn(),
    createSeason: vi.fn(),
    closeSeason: vi.fn(),
    recordMatch: vi.fn(),
    voidMatch: vi.fn(),
    listMatches: vi.fn(),
  },
}));

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn() },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const ADMIN_USER = { user: { id: 'admin-1', roles: ['USUARIO', 'ADMINISTRADOR'] } };
const RECEPCION_USER = { user: { id: 'staff-1', roles: ['USUARIO', 'RECEPCION'] } };

const OPEN_SEASON = {
  id: 'season-1',
  name: 'Temporada 1 · 2026',
  year: 2026,
  seasonNumber: 1,
  status: 'OPEN',
};

const PLAYER_A = { id: 'p1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Gomez' };
const PLAYER_B = { id: 'p2', email: 'beto@example.com', firstName: 'Beto', lastName: 'Ruiz' };

describe('CompetitionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    competitionClient.listMatches.mockResolvedValue({ matches: [] });
  });

  it('an ADMINISTRADOR sees the season creation form when there are no seasons yet', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    competitionClient.listSeasons.mockResolvedValue({ seasons: [] });

    render(<CompetitionPage />);

    expect(await screen.findByText('Todavía no hay ninguna temporada.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.queryByText('Registrar resultado')).not.toBeInTheDocument();
  });

  it('a non-admin staff member does not see season creation controls', async () => {
    useAuth.mockReturnValue(RECEPCION_USER);
    competitionClient.listSeasons.mockResolvedValue({ seasons: [] });

    render(<CompetitionPage />);

    await screen.findByText('Todavía no hay ninguna temporada.');
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
  });

  it('once a season exists, the match form appears with the correct participant slots for the modality', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });

    render(<CompetitionPage />);

    expect(await screen.findByRole('heading', { name: 'Registrar resultado' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Jugador')).toHaveLength(2); // singles default

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Dobles' }));
    expect(screen.getAllByLabelText(/Jugador \d/)).toHaveLength(4);
  });

  it('records a singles match by resolving participant emails, then refreshes the history', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
    membershipClient.lookupUser.mockImplementation((email) =>
      email === PLAYER_A.email ? Promise.resolve(PLAYER_A) : Promise.resolve(PLAYER_B),
    );
    competitionClient.recordMatch.mockResolvedValue({ id: 'match-1', status: 'RECORDED' });

    const user = userEvent.setup();
    render(<CompetitionPage />);
    await screen.findByRole('heading', { name: 'Registrar resultado' });

    const [playerAInput, playerBInput] = screen.getAllByLabelText('Jugador');
    await user.type(playerAInput, PLAYER_A.email);
    await user.type(playerBInput, PLAYER_B.email);
    await user.type(screen.getByLabelText('Sets ganados (A)'), '2');
    await user.type(screen.getByLabelText('Sets ganados (B)'), '0');
    await user.type(screen.getByLabelText('Fecha del partido'), '2026-03-01');
    await user.click(screen.getByRole('button', { name: 'Registrar resultado' }));

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
          playedAt: '2026-03-01',
        }),
      ),
    );
    await waitFor(() => expect(competitionClient.listMatches).toHaveBeenCalledTimes(2));
  });

  it('voiding a match requires a reason and refreshes the history to show VOID', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
    competitionClient.listMatches.mockResolvedValueOnce({
      matches: [
        {
          id: 'match-1',
          status: 'RECORDED',
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          playedAt: '2026-03-01T00:00:00.000Z',
          participantsA: [{ playerId: 'p1', firstName: 'Ana', lastName: 'Gomez' }],
          participantsB: [{ playerId: 'p2', firstName: 'Beto', lastName: 'Ruiz' }],
        },
      ],
    });
    competitionClient.voidMatch.mockResolvedValue({ id: 'match-1', status: 'VOID' });

    const user = userEvent.setup();
    render(<CompetitionPage />);
    await screen.findByText('Ana Gomez vs Beto Ruiz');

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
    // required field, empty submit shouldn't call the API
    expect(competitionClient.voidMatch).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Motivo de anulación'), 'resultado incorrecto');
    competitionClient.listMatches.mockResolvedValueOnce({
      matches: [
        {
          id: 'match-1',
          status: 'VOID',
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          playedAt: '2026-03-01T00:00:00.000Z',
          participantsA: [{ playerId: 'p1', firstName: 'Ana', lastName: 'Gomez' }],
          participantsB: [{ playerId: 'p2', firstName: 'Beto', lastName: 'Ruiz' }],
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }));

    await waitFor(() =>
      expect(competitionClient.voidMatch).toHaveBeenCalledWith('match-1', 'resultado incorrecto'),
    );
    expect(await screen.findByText('Anulado')).toBeInTheDocument();
  });
});
