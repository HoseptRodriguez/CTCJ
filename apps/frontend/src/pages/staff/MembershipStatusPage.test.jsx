import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { membershipClient } from '../../api/membershipClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { MembershipStatusPage } from './MembershipStatusPage.jsx';

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: {
    lookupUser: vi.fn(),
    setMembershipStatus: vi.fn(),
    getOverduePolicy: vi.fn(),
    setOverduePolicy: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const PLAYER = {
  id: 'user-1',
  email: 'jugador@example.com',
  firstName: 'Ana',
  lastName: 'Gomez',
  roleCodes: ['USUARIO', 'JUGADOR'],
  membershipStatus: null,
};

function renderAsAdmin() {
  useAuth.mockReturnValue({ user: { id: 'admin-1', roles: ['ADMINISTRADOR'] } });
  membershipClient.getOverduePolicy.mockResolvedValue({ enabled: false });
  return render(<MembershipStatusPage />);
}

async function searchFor(user, email) {
  await user.type(screen.getByLabelText('Correo del jugador'), email);
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('MembershipStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('admin: looks up a player and can set a new status', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    membershipClient.setMembershipStatus.mockResolvedValue({
      userId: PLAYER.id,
      membershipStatus: 'OVERDUE',
    });

    const user = userEvent.setup();
    renderAsAdmin();
    await waitFor(() => expect(membershipClient.getOverduePolicy).toHaveBeenCalled());

    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText(PLAYER.email)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado de membresía'), 'Vencido');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(membershipClient.setMembershipStatus).toHaveBeenCalledWith(PLAYER.id, 'OVERDUE'),
    );
    expect(await screen.findByText('Estado actualizado.')).toBeInTheDocument();
  });

  it('shows a Spanish error when the email is not found', async () => {
    const notFound = new Error('not found');
    notFound.code = 'user_not_found';
    membershipClient.lookupUser.mockRejectedValue(notFound);

    const user = userEvent.setup();
    renderAsAdmin();
    await waitFor(() => expect(membershipClient.getOverduePolicy).toHaveBeenCalled());

    await searchFor(user, 'nadie@example.com');

    expect(
      await screen.findByText('No se encontró ningún usuario con ese correo.'),
    ).toBeInTheDocument();
  });

  it('admin: can toggle the overdue booking policy', async () => {
    membershipClient.getOverduePolicy.mockResolvedValue({ enabled: false });
    membershipClient.setOverduePolicy.mockResolvedValue({ enabled: true });

    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { id: 'admin-1', roles: ['ADMINISTRADOR'] } });
    render(<MembershipStatusPage />);

    expect(await screen.findByText('Desactivado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar bloqueo' }));

    await waitFor(() => expect(membershipClient.setOverduePolicy).toHaveBeenCalledWith(true));
    expect(await screen.findByText('Activo')).toBeInTheDocument();
  });

  it('RECEPCION can look up a player but has no write controls', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    useAuth.mockReturnValue({ user: { id: 'staff-1', roles: ['RECEPCION'] } });

    const user = userEvent.setup();
    render(<MembershipStatusPage />);

    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.queryByLabelText('Estado de membresía')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
    expect(screen.queryByText('Bloqueo de reservas por mora')).not.toBeInTheDocument();
    expect(membershipClient.getOverduePolicy).not.toHaveBeenCalled();
  });
});
