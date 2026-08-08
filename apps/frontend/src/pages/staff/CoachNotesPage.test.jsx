import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { coachingClient } from '../../api/coachingClient.js';
import { membershipClient } from '../../api/membershipClient.js';

import { CoachNotesPage } from './CoachNotesPage.jsx';

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn() },
}));

vi.mock('../../api/coachingClient.js', () => ({
  coachingClient: {
    createNote: vi.fn(),
    listPlayerNotes: vi.fn(),
    getMyNotes: vi.fn(),
    recordPerformanceSnapshot: vi.fn(),
    listPlayerPerformance: vi.fn(),
    getMyPerformance: vi.fn(),
  },
}));

const PLAYER = {
  id: 'user-1',
  email: 'jugador@example.com',
  firstName: 'Ana',
  lastName: 'Gomez',
  roleCodes: ['USUARIO', 'JUGADOR'],
};

const NOT_A_PLAYER = { ...PLAYER, id: 'user-2', roleCodes: ['USUARIO'] };

async function searchFor(user, email) {
  await user.type(screen.getByLabelText('Correo del jugador'), email);
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('CoachNotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coachingClient.listPlayerNotes.mockResolvedValue({ notes: [] });
    coachingClient.listPlayerPerformance.mockResolvedValue({
      ratings: [],
      summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} },
    });
  });

  it('shows the note form and list only for a JUGADOR target', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeInTheDocument();
  });

  it('does not show the note form for a non-JUGADOR target', async () => {
    membershipClient.lookupUser.mockResolvedValue(NOT_A_PLAYER);

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, NOT_A_PLAYER.email);

    expect(await screen.findByText('Este usuario no tiene el rol Jugador.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar nota' })).not.toBeInTheDocument();
  });

  it('creates a note and refreshes the list', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    coachingClient.createNote.mockResolvedValue({ id: 'note-1' });

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);
    await waitFor(() => expect(coachingClient.listPlayerNotes).toHaveBeenCalledWith('user-1'));

    await user.selectOptions(screen.getByLabelText('Tipo'), 'TECHNICAL');
    await user.selectOptions(screen.getByLabelText('Visibilidad'), 'PLAYER_VISIBLE');
    await user.type(screen.getByLabelText('Nota'), 'Buen revés hoy.');
    await user.click(screen.getByRole('button', { name: 'Agregar nota' }));

    await waitFor(() =>
      expect(coachingClient.createNote).toHaveBeenCalledWith('user-1', {
        noteType: 'TECHNICAL',
        visibility: 'PLAYER_VISIBLE',
        content: 'Buen revés hoy.',
      }),
    );
    await waitFor(() => expect(coachingClient.listPlayerNotes).toHaveBeenCalledTimes(2));
  });

  it('tags a note with a skill area when one is selected', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    coachingClient.createNote.mockResolvedValue({ id: 'note-1' });

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);
    await waitFor(() => expect(coachingClient.listPlayerNotes).toHaveBeenCalledWith('user-1'));

    await user.selectOptions(screen.getByLabelText('Habilidad (opcional)'), 'SERVE');
    await user.type(screen.getByLabelText('Nota'), 'Sube más el toss.');
    await user.click(screen.getByRole('button', { name: 'Agregar nota' }));

    await waitFor(() =>
      expect(coachingClient.createNote).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ area: 'SERVE' }),
      ),
    );
  });

  it('lists existing notes with type/visibility/content', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    coachingClient.listPlayerNotes.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          noteType: 'TACTICAL',
          visibility: 'PRIVATE',
          content: 'Necesita trabajar el saque.',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Necesita trabajar el saque.')).toBeInTheDocument();
    // Type + visibility render as one self-contained text node ("Táctica · Privada"),
    // distinct from the same words appearing separately as <option>s in the form below.
    expect(screen.getByText(/Táctica\s*·\s*Privada/)).toBeInTheDocument();
  });

  it('switches to the Rendimiento tab and shows the empty state with no ratings yet', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);
    await screen.findByRole('button', { name: 'Agregar nota' });

    await user.click(screen.getByRole('tab', { name: 'Rendimiento' }));

    expect(await screen.findByText('Sin evaluaciones registradas todavía.')).toBeInTheDocument();
    expect(coachingClient.listPlayerPerformance).toHaveBeenCalledWith('user-1');
  });

  it('records a partial performance snapshot with only the filled-in areas', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    coachingClient.recordPerformanceSnapshot.mockResolvedValue({ ratings: [] });

    const user = userEvent.setup();
    render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);
    await user.click(screen.getByRole('tab', { name: 'Rendimiento' }));
    await screen.findByText('Sin evaluaciones registradas todavía.');

    await user.type(screen.getByLabelText('Saque'), '7');
    await user.click(screen.getByRole('button', { name: 'Registrar evaluación' }));

    await waitFor(() =>
      expect(coachingClient.recordPerformanceSnapshot).toHaveBeenCalledWith('user-1', { SERVE: 7 }),
    );
  });

  it('renders charts when performance ratings exist', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    coachingClient.listPlayerPerformance.mockResolvedValue({
      ratings: [{ id: 'r1', area: 'SERVE', rating: 7, recordedAt: '2026-03-01T00:00:00.000Z' }],
      summary: { ratedAreas: ['SERVE'], latestByArea: { SERVE: 7 }, progressByArea: {} },
    });

    const user = userEvent.setup();
    const { container } = render(<CoachNotesPage />);
    await searchFor(user, PLAYER.email);
    await user.click(screen.getByRole('tab', { name: 'Rendimiento' }));

    await waitFor(() => expect(coachingClient.listPlayerPerformance).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelectorAll('svg').length).toBeGreaterThan(0));
  });
});
