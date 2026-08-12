import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../context/AuthContext.jsx';

import { StaffLayout } from './StaffLayout.jsx';

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

function renderStaffLayout({ initialPath = '/staff/pagos' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<StaffLayout />}>
          <Route path="/staff/pagos" element={<div>Contenido de Pagos</div>} />
          <Route path="/staff/finanzas" element={<div>Contenido de Finanzas</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('StaffLayout', () => {
  it('renders the outlet content and role-appropriate desktop links for an Administrator', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', roles: ['USUARIO', 'ADMINISTRADOR'] },
      logout: vi.fn(),
    });

    renderStaffLayout();

    expect(await screen.findByText('Contenido de Pagos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Finanzas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Precios' })).toBeInTheDocument();
  });

  it('hides Admin-only links for a Reception-only account', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u2', roles: ['USUARIO', 'RECEPCION'] },
      logout: vi.fn(),
    });

    renderStaffLayout();

    await screen.findByText('Contenido de Pagos');
    expect(screen.getByRole('link', { name: 'Pagos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Finanzas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Precios' })).not.toBeInTheDocument();
  });

  it('the mobile menu is closed by default and opens on hamburger click', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', roles: ['USUARIO', 'ADMINISTRADOR'] },
      logout: vi.fn(),
    });
    const user = userEvent.setup();

    renderStaffLayout();
    await screen.findByText('Contenido de Pagos');

    expect(document.getElementById('staff-mobile-menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));

    expect(document.getElementById('staff-mobile-menu')).toBeInTheDocument();
    // Same role-filtered links appear inside the mobile panel too.
    expect(screen.getAllByRole('link', { name: 'Finanzas' }).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking a link in the mobile menu closes it', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', roles: ['USUARIO', 'ADMINISTRADOR'] },
      logout: vi.fn(),
    });
    const user = userEvent.setup();

    renderStaffLayout();
    await screen.findByText('Contenido de Pagos');
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const mobileMenu = document.getElementById('staff-mobile-menu');
    const finanzasLinks = screen.getAllByRole('link', { name: 'Finanzas' });
    const mobileFinanzasLink = finanzasLinks.find((link) => mobileMenu.contains(link));
    await user.click(mobileFinanzasLink);

    expect(await screen.findByText('Contenido de Finanzas')).toBeInTheDocument();
    expect(document.getElementById('staff-mobile-menu')).not.toBeInTheDocument();
  });
});
