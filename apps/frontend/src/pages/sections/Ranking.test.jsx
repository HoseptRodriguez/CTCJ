import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { competitionClient } from '../../api/competitionClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { Ranking } from './Ranking.jsx';

function renderRanking() {
  return render(
    <MemoryRouter>
      <Ranking />
    </MemoryRouter>,
  );
}

vi.mock('../../api/competitionClient.js', () => ({
  competitionClient: { listSeasons: vi.fn(), getStandings: vi.fn() },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const OPEN_SEASON = {
  id: 'season-1',
  name: 'Temporada 1 · 2026',
  year: 2026,
  seasonNumber: 1,
  status: 'OPEN',
};

describe('Ranking section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ status: 'anonymous' });
  });

  it('shows the genuine "no active season" message when there are no seasons at all', async () => {
    competitionClient.listSeasons.mockResolvedValue({ seasons: [] });

    renderRanking();

    expect(await screen.findByText('Todavía no hay una temporada activa')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
  });

  it('never renders fake/demo player rows regardless of tab/category', async () => {
    // Regression for the standing "never invent player information" rule --
    // v7's own prototype rendered fake "Jugador Ejemplo A/B/C/D" rows.
    competitionClient.listSeasons.mockResolvedValue({ seasons: [] });
    const user = userEvent.setup();
    renderRanking();
    await screen.findByText('Todavía no hay una temporada activa');

    await user.click(screen.getByRole('tab', { name: 'Dobles' }));
    await user.click(screen.getByRole('button', { name: 'Cuarta categoría' }));

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.queryByText(/Jugador Ejemplo/i)).not.toBeInTheDocument();
  });

  it('season selector is disabled with a single placeholder option when there are no seasons', async () => {
    competitionClient.listSeasons.mockResolvedValue({ seasons: [] });
    renderRanking();

    await waitFor(() => expect(competitionClient.listSeasons).toHaveBeenCalled());
    const select = screen.getByLabelText('Temporada');
    expect(select).toBeDisabled();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('an unauthenticated visitor sees a login-gated placeholder once a season exists, never real rows', async () => {
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });

    renderRanking();

    expect(
      await screen.findByText('Inicia sesión para ver la tabla de posiciones'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(competitionClient.getStandings).not.toHaveBeenCalled();
  });

  it('season selector reflects real fetched seasons, enabled, once seasons exist', async () => {
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
    renderRanking();

    const select = await screen.findByLabelText('Temporada');
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(screen.getByRole('option', { name: /Temporada 1 · 2026/ })).toBeInTheDocument();
  });

  it('an authenticated user sees real standings rows with player names', async () => {
    useAuth.mockReturnValue({ status: 'authenticated' });
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
    competitionClient.getStandings.mockResolvedValue({
      standings: [
        {
          playerId: 'p1',
          playerName: 'Ana Gomez',
          points: 4,
          setDiff: 3,
          rank: 1,
          qualifiesForMasters: true,
        },
        {
          playerId: 'p2',
          playerName: 'Beto Ruiz',
          points: 2,
          setDiff: -1,
          rank: 2,
          qualifiesForMasters: true,
        },
      ],
    });

    renderRanking();

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText('Beto Ruiz')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header row + 2 data rows
    await waitFor(() =>
      expect(competitionClient.getStandings).toHaveBeenCalledWith({
        seasonId: 'season-1',
        category: 'SEGUNDA',
        modality: 'SINGLES',
      }),
    );
  });

  it('an authenticated user sees an empty-state message when the category has no matches yet', async () => {
    useAuth.mockReturnValue({ status: 'authenticated' });
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
    competitionClient.getStandings.mockResolvedValue({ standings: [] });

    renderRanking();

    expect(
      await screen.findByText('Sin partidos registrados en esta categoría todavía.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('switching category re-fetches standings for the new category', async () => {
    useAuth.mockReturnValue({ status: 'authenticated' });
    competitionClient.listSeasons.mockResolvedValue({ seasons: [OPEN_SEASON] });
    competitionClient.getStandings.mockResolvedValue({ standings: [] });
    const user = userEvent.setup();

    renderRanking();
    await waitFor(() =>
      expect(competitionClient.getStandings).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'SEGUNDA' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Cuarta categoría' }));

    await waitFor(() =>
      expect(competitionClient.getStandings).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'CUARTA' }),
      ),
    );
  });
});
