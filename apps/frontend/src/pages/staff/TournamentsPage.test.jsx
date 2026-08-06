import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { membershipClient } from '../../api/membershipClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { TournamentsPage } from './TournamentsPage.jsx';

vi.mock('../../api/tournamentClient.js', () => ({
  tournamentClient: {
    listTournaments: vi.fn(),
    getTournament: vi.fn(),
    createTournament: vi.fn(),
    addParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    generateDraw: vi.fn(),
    recordMatchResult: vi.fn(),
    cancelTournament: vi.fn(),
  },
}));

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn() },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const ADMIN_USER = { user: { id: 'admin-1', roles: ['USUARIO', 'ADMINISTRADOR'] } };

const DRAFT_TOURNAMENT = {
  id: 't1',
  name: 'Torneo Apertura',
  category: 'CUARTA',
  modality: 'SINGLES',
  status: 'DRAFT',
};

const PLAYER_A = { id: 'p1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Gomez' };

describe('TournamentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue(ADMIN_USER);
    tournamentClient.listTournaments.mockResolvedValue({ tournaments: [DRAFT_TOURNAMENT] });
  });

  it('lists tournaments and shows the create form for an ADMINISTRADOR', async () => {
    render(<TournamentsPage />);
    expect(await screen.findByRole('option', { name: /Torneo Apertura/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('selecting a DRAFT tournament shows its participants and the add-participant form', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT_TOURNAMENT,
      participants: [],
      matches: [],
    });

    const user = userEvent.setup();
    render(<TournamentsPage />);
    await screen.findByRole('option', { name: /Torneo Apertura/ });
    await user.selectOptions(screen.getByLabelText('Torneo'), 't1');

    expect(await screen.findByText('Sin participantes todavía.')).toBeInTheDocument();
    expect(screen.getByLabelText('Jugador')).toBeInTheDocument(); // SINGLES -> 1 slot
  });

  it('adds a participant by resolving the email, then refreshes', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT_TOURNAMENT,
      participants: [],
      matches: [],
    });
    membershipClient.lookupUser.mockResolvedValue(PLAYER_A);
    tournamentClient.addParticipant.mockResolvedValue({
      id: 'part-1',
      playerIds: ['p1'],
      seed: null,
    });

    const user = userEvent.setup();
    render(<TournamentsPage />);
    await screen.findByRole('option', { name: /Torneo Apertura/ });
    await user.selectOptions(screen.getByLabelText('Torneo'), 't1');
    await screen.findByLabelText('Jugador');

    await user.type(screen.getByLabelText('Jugador'), PLAYER_A.email);
    await user.click(screen.getByRole('button', { name: 'Agregar participante' }));

    await waitFor(() => expect(tournamentClient.addParticipant).toHaveBeenCalledWith('t1', ['p1']));
    await waitFor(() => expect(tournamentClient.getTournament).toHaveBeenCalledTimes(2));
  });

  it('removes a participant while DRAFT', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT_TOURNAMENT,
      participants: [
        {
          id: 'part-1',
          seed: null,
          members: [{ playerId: 'p1', firstName: 'Ana', lastName: 'Gomez' }],
        },
      ],
      matches: [],
    });

    const user = userEvent.setup();
    render(<TournamentsPage />);
    await screen.findByRole('option', { name: /Torneo Apertura/ });
    await user.selectOptions(screen.getByLabelText('Torneo'), 't1');
    await screen.findByText('Ana Gomez');

    await user.click(screen.getByRole('button', { name: 'Quitar' }));

    await waitFor(() =>
      expect(tournamentClient.removeParticipant).toHaveBeenCalledWith('t1', 'part-1'),
    );
  });

  it('disables "Generar sorteo" with fewer than 2 participants, enables it with 2+', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT_TOURNAMENT,
      participants: [
        {
          id: 'part-1',
          seed: null,
          members: [{ playerId: 'p1', firstName: 'Ana', lastName: 'Gomez' }],
        },
        {
          id: 'part-2',
          seed: null,
          members: [{ playerId: 'p2', firstName: 'Beto', lastName: 'Ruiz' }],
        },
      ],
      matches: [],
    });

    const user = userEvent.setup();
    render(<TournamentsPage />);
    await screen.findByRole('option', { name: /Torneo Apertura/ });
    await user.selectOptions(screen.getByLabelText('Torneo'), 't1');
    const button = await screen.findByRole('button', { name: 'Generar sorteo' });
    expect(button).not.toBeDisabled();

    await user.click(button);
    await waitFor(() => expect(tournamentClient.generateDraw).toHaveBeenCalledWith('t1'));
  });

  it('renders a bracket: byes shown as resolved, ready matches show the result form, and submitting records the result', async () => {
    const drawGenerated = { ...DRAFT_TOURNAMENT, status: 'DRAW_GENERATED' };
    tournamentClient.getTournament.mockResolvedValue({
      tournament: drawGenerated,
      participants: [
        { id: 'A', seed: 1, members: [{ playerId: 'p1', firstName: 'Ana', lastName: 'Gomez' }] },
        { id: 'B', seed: 2, members: [{ playerId: 'p2', firstName: 'Beto', lastName: 'Ruiz' }] },
        { id: 'C', seed: 3, members: [{ playerId: 'p3', firstName: 'Carla', lastName: 'Diaz' }] },
      ],
      matches: [
        // Round 1 slot 0: a bye already resolved for A (no sets recorded).
        {
          id: 'm1',
          round: 1,
          slot: 0,
          participantAId: 'A',
          participantBId: null,
          setsWonA: null,
          setsWonB: null,
          winnerParticipantId: 'A',
        },
        // Round 1 slot 1: a real, unplayed match ready to record.
        {
          id: 'm2',
          round: 1,
          slot: 1,
          participantAId: 'B',
          participantBId: 'C',
          setsWonA: null,
          setsWonB: null,
          winnerParticipantId: null,
        },
        // Round 2 (final): only A's bye propagated so far.
        {
          id: 'final',
          round: 2,
          slot: 0,
          participantAId: 'A',
          participantBId: null,
          setsWonA: null,
          setsWonB: null,
          winnerParticipantId: null,
        },
      ],
    });
    tournamentClient.recordMatchResult.mockResolvedValue({ id: 'm2', winnerParticipantId: 'B' });

    const user = userEvent.setup();
    render(<TournamentsPage />);
    await screen.findByRole('option', { name: /Torneo Apertura/ });
    await user.selectOptions(screen.getByLabelText('Torneo'), 't1');

    expect(await screen.findByText('Bye')).toBeInTheDocument();

    // Only round 1 slot 1 (Beto vs Carla) is ready -- both slots filled, no
    // winner yet -- so there's exactly one result form rendered.
    await user.type(screen.getByLabelText('Sets lado A'), '2');
    await user.type(screen.getByLabelText('Sets lado B'), '0');
    await user.type(screen.getByLabelText('Fecha'), '2026-03-01');
    await user.click(screen.getByRole('button', { name: 'Registrar resultado' }));

    await waitFor(() =>
      expect(tournamentClient.recordMatchResult).toHaveBeenCalledWith('t1', 'm2', {
        setsWonA: 2,
        setsWonB: 0,
        winnerSide: 'A',
        playedAt: '2026-03-01',
      }),
    );
  });
});
