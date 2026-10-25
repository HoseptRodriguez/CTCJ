import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { membershipClient } from '../../api/membershipClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
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
  membershipClient: { lookupUser: vi.fn(), searchPlayers: vi.fn() },
}));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

const DRAFT = {
  id: 't1',
  name: 'Torneo Apertura',
  category: 'CUARTA',
  modality: 'SINGLES',
  status: 'DRAFT',
};
const ANA = { id: 'p1', firstName: 'Ana', lastName: 'Gomez' };
const participant = (id, p, seed) => ({
  id,
  seed,
  members: [{ playerId: p.id, firstName: p.firstName, lastName: p.lastName }],
});

function renderAs(roles) {
  useAuth.mockReturnValue({ user: { id: 'staff-1', roles: ['USUARIO', ...roles] } });
  return render(
    <ToastProvider>
      <TournamentsPage />
    </ToastProvider>,
  );
}

async function openTournament(user) {
  await user.click(await screen.findByRole('button', { name: 'Abrir' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  tournamentClient.listTournaments.mockResolvedValue({ tournaments: [DRAFT] });
  tournamentClient.getTournament.mockResolvedValue({
    tournament: DRAFT,
    participants: [],
    matches: [],
  });
  membershipClient.searchPlayers.mockResolvedValue({ players: [ANA] });
});

describe('TournamentsPage (Torneos)', () => {
  it('lists tournaments as big rows; an admin can create one', async () => {
    tournamentClient.createTournament.mockResolvedValue({ id: 't2' });
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    expect(await screen.findByText('Torneo Apertura')).toBeInTheDocument();
    expect(screen.getByText('Inscripciones abiertas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nuevo torneo' }));
    const panel = await screen.findByRole('dialog', { name: 'Nuevo torneo' });
    await user.type(within(panel).getByLabelText(/Nombre del torneo/), 'Abierto de Octubre');
    await user.click(within(panel).getByRole('button', { name: 'Crear torneo' }));
    await waitFor(() =>
      expect(tournamentClient.createTournament).toHaveBeenCalledWith({
        name: 'Abierto de Octubre',
        category: 'SEGUNDA',
        modality: 'SINGLES',
      }),
    );
  });

  it('Recepción cannot create tournaments', async () => {
    renderAs(['RECEPCION']);
    await screen.findByText('Torneo Apertura');
    expect(screen.queryByRole('button', { name: 'Nuevo torneo' })).not.toBeInTheDocument();
  });

  it('inscribes a player chosen by name', async () => {
    tournamentClient.addParticipant.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['RECEPCION']);
    await openTournament(user);
    await user.click(await screen.findByRole('button', { name: 'Inscribir jugador' }));
    const panel = await screen.findByRole('dialog', { name: 'Inscribir jugador' });
    await user.type(within(panel).getByLabelText('Jugador'), 'Ana');
    await user.click(
      await within(panel).findByRole('button', { name: 'Ana Gomez' }, { timeout: 2000 }),
    );
    await user.click(within(panel).getByRole('button', { name: 'Inscribir' }));
    await waitFor(() => expect(tournamentClient.addParticipant).toHaveBeenCalledWith('t1', ['p1']));
  });

  it('removing an inscription asks first', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT,
      participants: [participant('A', ANA)],
      matches: [],
    });
    tournamentClient.removeParticipant.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await openTournament(user);
    await user.click(await screen.findByRole('button', { name: 'Quitar' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Quitar a Ana Gomez?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, quitar' }));
    await waitFor(() => expect(tournamentClient.removeParticipant).toHaveBeenCalledWith('t1', 'A'));
  });

  it('"Generar sorteo" needs 2+ inscribed and a confirmation', async () => {
    tournamentClient.getTournament.mockResolvedValueOnce({
      tournament: DRAFT,
      participants: [participant('A', ANA)],
      matches: [],
    });
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await openTournament(user);
    expect(await screen.findByRole('button', { name: 'Generar sorteo' })).toBeDisabled();

    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT,
      participants: [
        participant('A', ANA),
        participant('B', { id: 'p2', firstName: 'Beto', lastName: 'Ruiz' }),
      ],
      matches: [],
    });
    tournamentClient.generateDraw.mockResolvedValue({});
    await user.click(screen.getByRole('button', { name: 'Volver a torneos' }));
    await openTournament(user);
    await user.click(await screen.findByRole('button', { name: 'Generar sorteo' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Generar el sorteo?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, generar sorteo' }));
    await waitFor(() => expect(tournamentClient.generateDraw).toHaveBeenCalledWith('t1'));
  });

  it('bracket: byes resolve on their own, ready matches get "Registrar resultado"', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: { ...DRAFT, status: 'DRAW_GENERATED' },
      participants: [
        participant('A', ANA, 1),
        participant('B', { id: 'p2', firstName: 'Beto', lastName: 'Ruiz' }, 2),
        participant('C', { id: 'p3', firstName: 'Carla', lastName: 'Diaz' }, 3),
      ],
      matches: [
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
    tournamentClient.recordMatchResult.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ENTRENADOR']);
    await openTournament(user);

    expect(await screen.findByText('Pasa directo (sin rival)')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Final' })).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Registrar resultado' });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);

    const panel = await screen.findByRole('dialog', { name: 'Registrar resultado' });
    await user.click(
      within(within(panel).getByRole('group', { name: 'Sets de Beto Ruiz' })).getByRole('radio', {
        name: '2',
      }),
    );
    await user.click(
      within(within(panel).getByRole('group', { name: 'Sets de Carla Diaz' })).getByRole('radio', {
        name: '0',
      }),
    );
    fireEvent.change(within(panel).getByLabelText('Fecha del partido'), {
      target: { value: '2026-03-01' },
    });
    await user.click(within(panel).getByRole('button', { name: 'Guardar resultado' }));
    await waitFor(() =>
      expect(tournamentClient.recordMatchResult).toHaveBeenCalledWith('t1', 'm2', {
        setsWonA: 2,
        setsWonB: 0,
        winnerSide: 'A',
        playedAt: '2026-03-01',
      }),
    );
  });

  it('a physiotherapist only looks at the bracket', async () => {
    tournamentClient.getTournament.mockResolvedValue({
      tournament: DRAFT,
      participants: [participant('A', ANA)],
      matches: [],
    });
    const user = userEvent.setup();
    renderAs(['FISIOTERAPEUTA']);
    await openTournament(user);
    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inscribir jugador' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });
});
