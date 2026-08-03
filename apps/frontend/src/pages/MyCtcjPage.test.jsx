import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../api/affiliationClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
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

vi.mock('../api/affiliationClient.js', () => ({
  affiliationClient: { getMyRequests: vi.fn(), submitRequest: vi.fn() },
}));

vi.mock('../api/guardianshipClient.js', () => ({
  guardianshipClient: { listMine: vi.fn(), requestGuardianship: vi.fn() },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

describe('MyCtcjPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockResolvedValue({ reservations: [] });
    affiliationClient.getMyRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listMine.mockResolvedValue({ guardianships: [] });
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

  it('a plain USUARIO sees the affiliation request form and can submit it', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    affiliationClient.submitRequest.mockResolvedValue({ id: 'req-1', status: 'PENDING' });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Afiliación a la academia')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Solicitar afiliación' }));

    await waitFor(() =>
      expect(affiliationClient.submitRequest).toHaveBeenCalledWith({ notes: undefined }),
    );
  });

  it('a JUGADOR does not see the affiliation section', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Afiliación a la academia')).not.toBeInTheDocument();
  });

  it('can request a guardianship link and see it listed', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    guardianshipClient.requestGuardianship.mockResolvedValue({ id: 'g1', status: 'PENDING' });
    guardianshipClient.listMine.mockResolvedValueOnce({ guardianships: [] }).mockResolvedValueOnce({
      guardianships: [{ id: 'g1', minorEmail: 'hijo@example.com', status: 'PENDING' }],
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Cuentas vinculadas')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Correo del menor'), 'hijo@example.com');
    await user.click(screen.getByRole('button', { name: 'Solicitar vinculación' }));

    await waitFor(() =>
      expect(guardianshipClient.requestGuardianship).toHaveBeenCalledWith({
        minorEmail: 'hijo@example.com',
        canPay: false,
        canBook: true,
      }),
    );
    expect(await screen.findByText('hijo@example.com')).toBeInTheDocument();
  });
});
