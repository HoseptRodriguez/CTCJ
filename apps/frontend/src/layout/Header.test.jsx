import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../context/AuthContext.jsx';

import { Header } from './Header.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/notificationsClient.js', () => ({
  notificationsClient: {
    getMyNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('shows no notification bell for an anonymous visitor', () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null, logout: vi.fn() });

    renderHeader();

    expect(screen.queryByLabelText('Notificaciones')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument();
  });

  it('keeps the notification bell reachable in the mobile toggle group, not only the desktop-only block', () => {
    useAuth.mockReturnValue({
      status: 'authenticated',
      user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] },
      logout: vi.fn(),
    });

    renderHeader();

    const hamburger = screen.getByRole('button', { name: 'Abrir menú' });
    const mobileGroup = hamburger.parentElement;
    expect(mobileGroup.querySelector('[aria-label^="Notificaciones"]')).not.toBeNull();
  });
});
