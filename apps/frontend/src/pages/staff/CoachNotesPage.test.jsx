import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { CoachNotesPage } from './CoachNotesPage.jsx';

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn(), searchPlayers: vi.fn() },
}));
vi.mock('../../api/bookingClient.js', () => ({ bookingClient: { getSchedule: vi.fn() } }));
vi.mock('../../api/coachingClient.js', () => ({
  coachingClient: {
    createNote: vi.fn(),
    listPlayerNotes: vi.fn(),
    recordPerformanceSnapshot: vi.fn(),
    listPlayerPerformance: vi.fn(),
  },
}));

const PLAYER = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Gómez',
  roleCodes: ['USUARIO', 'JUGADOR'],
};

function renderPage(path = '/staff/notas') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <CoachNotesPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

const withPlayer = '/staff/notas?jugador=user-1&nombre=Ana%20G%C3%B3mez';

beforeEach(() => {
  vi.clearAllMocks();
  bookingClient.getSchedule.mockResolvedValue({ courts: [], reservations: [] });
  coachingClient.listPlayerNotes.mockResolvedValue({ notes: [] });
  coachingClient.listPlayerPerformance.mockResolvedValue({ ratings: [], summary: {} });
  membershipClient.searchPlayers.mockResolvedValue({ players: [PLAYER] });
  membershipClient.lookupUser.mockResolvedValue(PLAYER);
});

describe('CoachNotesPage (Notas y rendimiento)', () => {
  it('asks to choose a player, then finds one by name and opens the blue card', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('Elige un jugador')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nombre o correo del jugador'), 'Ana');
    await user.click(await screen.findByRole('button', { name: 'Ana Gómez' }, { timeout: 2000 }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Ana Gómez' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Rendimiento' })).toBeInTheDocument();
  });

  it('an e-mail that is not a player says so', async () => {
    membershipClient.lookupUser.mockResolvedValue({ ...PLAYER, roleCodes: ['USUARIO'] });
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Nombre o correo del jugador'), 'otro@example.com');
    expect(
      await screen.findByText('Esa cuenta no es de un jugador.', {}, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it('opens the player from the link (?jugador=) and lists notes with who can see them', async () => {
    coachingClient.listPlayerNotes.mockResolvedValue({
      notes: [
        {
          id: 'n1',
          noteType: 'TECHNICAL',
          visibility: 'PRIVATE',
          content: 'Codo alto en el saque.',
          area: 'SERVE',
          createdAt: '2026-09-01T12:00:00Z',
        },
      ],
    });
    renderPage(withPlayer);
    expect(await screen.findByText('Codo alto en el saque.')).toBeInTheDocument();
    const list = screen.getByText('Codo alto en el saque.').closest('li');
    expect(within(list).getByText('Técnica')).toBeInTheDocument();
    expect(within(list).getByText('Solo entrenadores')).toBeInTheDocument();
    expect(within(list).getByText('Saque')).toBeInTheDocument();
  });

  it('new note: 4 type buttons, visibility choice, the no-edit warning, and saves', async () => {
    const saved = {
      id: 'n2',
      noteType: 'TACTICAL',
      visibility: 'PLAYER_VISIBLE',
      content: 'Sube más a la red.',
      createdAt: '2026-09-25T12:00:00Z',
    };
    coachingClient.createNote.mockResolvedValue(saved);
    const user = userEvent.setup();
    renderPage(withPlayer);

    const types = await screen.findByRole('group', { name: 'Tipo de nota' });
    expect(within(types).getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByText('Las notas no se pueden editar después de guardarlas.'),
    ).toBeInTheDocument();

    await user.click(within(types).getByRole('radio', { name: 'Táctica' }));
    await user.type(screen.getByLabelText('Nota'), 'Sube más a la red.');
    // Must choose who sees it.
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elige quién puede ver la nota.');
    expect(coachingClient.createNote).not.toHaveBeenCalled();

    await user.click(screen.getByRole('radio', { name: /La ve el jugador/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(coachingClient.createNote).toHaveBeenCalledWith('user-1', {
      noteType: 'TACTICAL',
      visibility: 'PLAYER_VISIBLE',
      content: 'Sube más a la red.',
      area: undefined,
    });
    expect(await screen.findByText('Sube más a la red.', { selector: 'p' })).toBeInTheDocument();
  });

  it('Rendimiento: 10 skills × 10 numbered buttons; saves only what was rated', async () => {
    coachingClient.recordPerformanceSnapshot.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage(withPlayer);
    await user.click(await screen.findByRole('tab', { name: 'Rendimiento' }));

    const groups = await screen.findAllByRole('radiogroup');
    expect(groups).toHaveLength(10);
    for (const g of groups) expect(within(g).getAllByRole('radio')).toHaveLength(10);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Saque' })).getByRole('radio', {
        name: '7 de 10',
      }),
    );
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Devolución' })).getByRole('radio', {
        name: '5 de 10',
      }),
    );
    expect(screen.getByText('2 de 10 calificadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar calificación' }));

    await waitFor(() =>
      expect(coachingClient.recordPerformanceSnapshot).toHaveBeenCalledWith('user-1', {
        SERVE: 7,
        RETURN: 5,
      }),
    );
  });

  it('Rendimiento: shows the last rating of each skill and the radar when there is history', async () => {
    coachingClient.listPlayerPerformance.mockResolvedValue({
      ratings: [{ area: 'FOREHAND', rating: 8, recordedAt: '2026-09-20T12:00:00Z' }],
      summary: {},
    });
    const user = userEvent.setup();
    renderPage(withPlayer);
    await user.click(await screen.findByRole('tab', { name: 'Rendimiento' }));
    expect(await screen.findByText('Última: 8')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cómo va' })).toBeInTheDocument();
  });
});
