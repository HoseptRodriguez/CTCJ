import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../api/affiliationClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { communityAdminClient } from '../api/communityAdminClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { StaffLayout } from './StaffLayout.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/notificationsClient.js', () => ({
  notificationsClient: {
    getMyNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));
vi.mock('../api/bookingClient.js', () => ({ bookingClient: { getSchedule: vi.fn() } }));
vi.mock('../api/communityAdminClient.js', () => ({
  communityAdminClient: { listReports: vi.fn() },
}));
vi.mock('../api/affiliationClient.js', () => ({ affiliationClient: { listRequests: vi.fn() } }));
vi.mock('../api/guardianshipClient.js', () => ({
  guardianshipClient: { listGuardianships: vi.fn() },
}));
vi.mock('../api/membershipClient.js', () => ({
  membershipClient: {
    getMyProfile: vi.fn(),
    searchPlayers: vi.fn(),
    lookupUser: vi.fn(),
  },
}));

function asRoles(...roles) {
  useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', ...roles] }, logout: vi.fn() });
}

function renderLayout(path = '/staff/pagos') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<StaffLayout />}>
          <Route path="/staff/*" element={<div>Contenido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const sidebar = () => screen.getByRole('navigation', { name: 'Consola del club' });

beforeEach(() => {
  vi.clearAllMocks();
  membershipClient.getMyProfile.mockResolvedValue({ firstName: 'Marta' });
  bookingClient.getSchedule.mockResolvedValue({
    reservations: [
      { id: 'r1', status: 'CONFIRMED', paymentId: null },
      { id: 'r2', status: 'CONFIRMED', paymentId: 'p1' },
      { id: 'r3', status: 'HOLD', paymentId: null },
    ],
  });
  communityAdminClient.listReports.mockResolvedValue({ reports: [{ id: 'x' }, { id: 'y' }] });
  affiliationClient.listRequests.mockResolvedValue({ requests: [{ id: 'a' }] });
  guardianshipClient.listGuardianships.mockResolvedValue({
    guardianships: [{ id: 'g' }, { id: 'h' }],
  });
});

describe('StaffLayout', () => {
  it('Administrador: grouped sidebar with Inicio and amber pending counters', async () => {
    asRoles('ADMINISTRADOR');
    renderLayout();

    expect(await screen.findByText('Contenido')).toBeInTheDocument();
    const nav = sidebar();
    for (const group of ['Día a día', 'Jugadores', 'Competencia', 'Administración']) {
      expect(within(nav).getByText(group)).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'href',
      '/staff/panel',
    );
    // 1 confirmed & unpaid today; 1 affiliation + 2 guardianships; 2 reports.
    expect(
      await within(nav).findByRole('link', { name: 'Cobros 1 pendientes' }),
    ).toBeInTheDocument();
    expect(
      await within(nav).findByRole('link', { name: 'Solicitudes 3 pendientes' }),
    ).toBeInTheDocument();
    expect(
      await within(nav).findByRole('link', { name: 'Moderar comunidad 2 pendientes' }),
    ).toBeInTheDocument();
  });

  it('Recepción: no admin-only links and no admin-only counter requests', async () => {
    asRoles('RECEPCION');
    renderLayout();

    await screen.findByText('Contenido');
    const nav = sidebar();
    expect(within(nav).getByRole('link', { name: /Cobros/ })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Finanzas' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /Solicitudes/ })).not.toBeInTheDocument();
    expect(affiliationClient.listRequests).not.toHaveBeenCalled();
    expect(guardianshipClient.listGuardianships).not.toHaveBeenCalled();
  });

  it('Entrenador: Inicio is the class panel and no desk counters are fetched', async () => {
    asRoles('ENTRENADOR');
    renderLayout('/staff/panel-entrenador');

    await screen.findByText('Contenido');
    expect(within(sidebar()).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'href',
      '/staff/panel-entrenador',
    );
    expect(within(sidebar()).queryByRole('link', { name: /Cobros/ })).not.toBeInTheDocument();
    expect(bookingClient.getSchedule).not.toHaveBeenCalled();
    expect(communityAdminClient.listReports).not.toHaveBeenCalled();
  });

  it('has the top bar: player search, large-text toggle and the user avatar', async () => {
    asRoles('ADMINISTRADOR');
    renderLayout();

    expect(
      await screen.findByRole('searchbox', { name: 'Buscar jugador por nombre o correo' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /letra grande/i }).length).toBeGreaterThan(0);
    expect(await screen.findByText('Marta')).toBeInTheDocument();
  });

  it('phone bar: 4 destinations plus "Más", which opens the rest', async () => {
    asRoles('ADMINISTRADOR');
    renderLayout();

    const bar = await screen.findByRole('navigation', { name: 'Consola, accesos principales' });
    expect(within(bar).getAllByRole('link')).toHaveLength(4);
    await userEvent.click(within(bar).getByRole('button', { name: /Más/ }));
    const panel = await screen.findByRole('dialog', { name: 'Más opciones' });
    expect(within(panel).getByRole('link', { name: 'Finanzas' })).toBeInTheDocument();
  });

  it('search by name links to the pages this role may open', async () => {
    asRoles('ENTRENADOR');
    membershipClient.searchPlayers.mockResolvedValue({
      players: [{ id: 'p9', firstName: 'Ana', lastName: 'Ruiz' }],
    });
    renderLayout('/staff/panel-entrenador');

    await userEvent.type(await screen.findByRole('searchbox'), 'Ana');
    expect(await screen.findByText('Ana Ruiz', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notas' })).toHaveAttribute(
      'href',
      '/staff/notas?jugador=p9&nombre=Ana%20Ruiz',
    );
    expect(screen.queryByRole('link', { name: 'Salud' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Membresía' })).not.toBeInTheDocument();
  });
});
