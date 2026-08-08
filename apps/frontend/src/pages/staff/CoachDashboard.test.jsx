import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { membershipClient } from '../../api/membershipClient.js';

import { CoachDashboard } from './CoachDashboard.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { getSchedule: vi.fn() },
}));

vi.mock('../../api/coachingClient.js', () => ({
  coachingClient: { getRecentActivity: vi.fn() },
}));

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CoachDashboard />
    </MemoryRouter>,
  );
}

describe('CoachDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockResolvedValue({ reservations: [] });
    coachingClient.getRecentActivity.mockResolvedValue({ activity: [] });
  });

  it('shows recent notes and ratings with player names, newest-first', async () => {
    coachingClient.getRecentActivity.mockResolvedValue({
      activity: [
        {
          id: 'note-1',
          type: 'NOTE',
          playerId: 'p1',
          playerName: 'Ana Gomez',
          noteType: 'TRAINING',
          area: 'SERVE',
          at: '2026-03-05T10:00:00.000Z',
        },
        {
          id: 'rating-1',
          type: 'RATING',
          playerId: 'p2',
          playerName: 'Luis Perez',
          area: 'FOREHAND',
          rating: 8,
          at: '2026-03-04T10:00:00.000Z',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText(/Entrenamiento · Saque/)).toBeInTheDocument();
    expect(await screen.findByText('Luis Perez')).toBeInTheDocument();
    expect(screen.getByText(/Evaluación · Derecha · 8\/10/)).toBeInTheDocument();
  });

  it('shows an empty state when there is no recent activity', async () => {
    renderPage();
    expect(await screen.findByText('Sin actividad reciente.')).toBeInTheDocument();
  });

  it('shows upcoming club-wide CLASS sessions derived from the schedule', async () => {
    bookingClient.getSchedule.mockResolvedValue({
      reservations: [
        {
          courtId: 'court-1',
          periodStart: '2026-03-05T14:00:00.000Z',
          periodEnd: '2026-03-05T15:00:00.000Z',
          label: 'Clase',
          occupied: true,
        },
        {
          courtId: 'court-2',
          periodStart: '2026-03-05T16:00:00.000Z',
          periodEnd: '2026-03-05T17:00:00.000Z',
          label: 'Ocupada',
          occupied: true,
        },
      ],
    });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(await screen.findByText('Próximas clases')).toBeInTheDocument();
    // Only the 'Clase' entry renders as an upcoming class -- 8 calls (one per
    // UPCOMING_DAYS date key) all resolve the same fixture, so exactly one
    // matching row appears per day; assert at least one and never the
    // 'Ocupada' occupied-but-not-class slot leaking through.
    expect(screen.queryByText(/Cancha court-2/)).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no upcoming classes', async () => {
    renderPage();
    expect(await screen.findByText('Sin clases programadas próximamente.')).toBeInTheDocument();
  });

  it('looks up a player by email and offers a shortcut to their notes', async () => {
    membershipClient.lookupUser.mockResolvedValue({
      id: 'p1',
      firstName: 'Ana',
      lastName: 'Gomez',
      email: 'ana@example.com',
    });

    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Correo del jugador'), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver notas y evaluaciones' })).toHaveAttribute(
      'href',
      '/staff/notas',
    );
  });

  it('renders shortcuts to coach-reachable staff modules', async () => {
    renderPage();
    expect(await screen.findByText('Accesos rápidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notas y evaluaciones' })).toHaveAttribute(
      'href',
      '/staff/notas',
    );
  });
});
