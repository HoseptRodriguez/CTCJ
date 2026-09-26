import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { CoachDashboard } from './CoachDashboard.jsx';

vi.mock('../../api/bookingClient.js', () => ({ bookingClient: { getSchedule: vi.fn() } }));
vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn(), searchPlayers: vi.fn() },
}));
vi.mock('../../api/coachingClient.js', () => ({
  coachingClient: {
    getRecentActivity: vi.fn(),
    listPlayerNotes: vi.fn(),
    listPlayerPerformance: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/staff/panel-entrenador']}>
        <CoachDashboard />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  bookingClient.getSchedule.mockResolvedValue({
    courts: [{ id: 'c2', name: 'Cancha 2' }],
    reservations: [
      {
        courtId: 'c2',
        label: 'Clase',
        periodStart: '2026-09-25T21:00:00Z',
        periodEnd: '2026-09-25T22:00:00Z',
      },
      {
        courtId: 'c2',
        label: 'Ocupada',
        periodStart: '2026-09-25T13:00:00Z',
        periodEnd: '2026-09-25T14:00:00Z',
      },
    ],
  });
  coachingClient.getRecentActivity.mockResolvedValue({
    activity: [
      {
        id: 'a1',
        type: 'NOTE',
        noteType: 'TECHNICAL',
        area: 'SERVE',
        playerName: 'Ana Gómez',
        at: '2026-09-24T15:00:00Z',
      },
      {
        id: 'a2',
        type: 'RATING',
        area: 'FOREHAND',
        rating: 8,
        playerName: 'Luis Paz',
        at: '2026-09-23T15:00:00Z',
      },
    ],
  });
});

describe('CoachDashboard (Clases de hoy)', () => {
  it("lists today's classes by court and time (only classes)", async () => {
    renderPage();
    const heading = await screen.findByRole('heading', { name: 'Clases de hoy', level: 2 });
    const card = heading.closest('section');
    expect(await screen.findByText(/Cancha 2 · hasta/)).toBeInTheDocument();
    expect(card.querySelectorAll('li')).toHaveLength(1);
  });

  it('"Ver semana" loads the next 8 days and groups the classes by day', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Cancha 2 · hasta/);
    expect(bookingClient.getSchedule).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Ver semana' }));
    const heading = await screen.findByRole('heading', { name: 'Clases de la semana', level: 2 });
    expect(bookingClient.getSchedule).toHaveBeenCalledTimes(9);
    const card = heading.closest('section');
    // The mock returns the same class every day: one group per day.
    expect(await within(card).findByRole('heading', { name: 'Hoy', level: 3 })).toBeInTheDocument();
    expect(within(card).getAllByRole('heading', { level: 3 })).toHaveLength(8);

    await user.click(screen.getByRole('button', { name: 'Ver solo hoy' }));
    expect(
      await screen.findByRole('heading', { name: 'Clases de hoy', level: 2 }),
    ).toBeInTheDocument();
  });

  it("shows the team's recent notes and ratings until a player is chosen", async () => {
    renderPage();
    expect(await screen.findByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText(/Nota de técnica \(Saque\)/)).toBeInTheDocument();
    expect(screen.getByText(/Derecha: 8 de 10/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre o correo del jugador')).toBeInTheDocument();
  });

  it('says so when there are no classes today', async () => {
    bookingClient.getSchedule.mockResolvedValue({ courts: [], reservations: [] });
    renderPage();
    expect(await screen.findByText('No hay clases programadas hoy')).toBeInTheDocument();
  });
});
