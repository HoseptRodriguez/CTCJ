import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../api/bookingClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { MyCtcjPage } from './MyCtcjPage.jsx';

function renderPage() {
  return render(
    <MemoryRouter>
      <MyCtcjPage />
    </MemoryRouter>,
  );
}

vi.mock('../api/bookingClient.js', () => ({
  bookingClient: { getSchedule: vi.fn() },
}));

vi.mock('../api/membershipClient.js', () => ({
  membershipClient: { getMyStatus: vi.fn() },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

describe('MyCtcjPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockResolvedValue({ reservations: [] });
  });

  it('shows a JUGADOR their own membership status', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: 'OVERDUE' });

    renderPage();

    expect(await screen.findByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Estado de membresía:')).toBeInTheDocument();
  });

  it('shows "Sin membresía" for a JUGADOR not yet enrolled (null status)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Sin membresía')).toBeInTheDocument();
  });

  it('never shows a membership status for a plain USUARIO', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Estado de membresía:')).not.toBeInTheDocument();
  });
});
