import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../../test/axe.js';
import { directoryClient } from '../../api/directoryClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { PlayersDirectoryPage } from './PlayersDirectoryPage.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/directoryClient.js', () => ({
  directoryClient: { list: vi.fn(), exportCsv: vi.fn() },
}));

const person = (id, over = {}) => ({
  id,
  firstName: 'Ana',
  lastName: 'Gómez',
  email: `${id}@example.com`,
  phone: null,
  avatarUrl: null,
  categories: ['TERCERA'],
  dominantHand: 'LEFT',
  lastLoginAt: '2026-09-20T15:00:00Z',
  isJugador: true,
  isMinor: false,
  pendingGuardianAuthorization: false,
  active: true,
  membershipStatus: 'OVERDUE',
  ...over,
});

const PAGE = (over = {}) => ({
  tab: 'players',
  tabs: ['players', 'all'],
  totals: { players: 30, users: 79 },
  total: 30,
  page: 1,
  pageSize: 25,
  items: [person('ana')],
  ...over,
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.search}</p>;
}

function renderPage(roles = ['ADMINISTRADOR']) {
  useAuth.mockReturnValue({ user: { id: 'me', roles } });
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/staff/jugadores']}>
        <Routes>
          <Route
            path="/staff/jugadores"
            element={
              <>
                <PlayersDirectoryPage />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  directoryClient.list.mockResolvedValue(PAGE());
  directoryClient.exportCsv.mockResolvedValue('jugadores.csv');
});

describe('Jugadores (directorio del personal)', () => {
  it('shows both totals as tabs and big rows with "Ver ficha"', async () => {
    renderPage();
    expect(await screen.findByRole('radio', { name: /Jugadores \(30\)/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Todos los usuarios \(79\)/ })).toBeInTheDocument();
    const row = screen.getByText('Ana Gómez').closest('li');
    expect(within(row).getByText('Vencida')).toBeInTheDocument();
    expect(within(row).getByText(/Tercera categoría · Zurdo · Último ingreso/)).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Ver ficha de Ana Gómez' })).toHaveAttribute(
      'href',
      '/staff/jugadores/ana',
    );
  });

  it('filters go to the server (and the URL): membership, minors, all users', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Gómez');
    await user.selectOptions(screen.getByLabelText('Estado de membresía'), 'NONE');
    await waitFor(() =>
      expect(directoryClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ membership: 'NONE', tab: 'players', page: 1 }),
      ),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Solo menores de edad' }));
    await waitFor(() =>
      expect(directoryClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ membership: 'NONE', minor: 'true' }),
      ),
    );
    await user.click(screen.getByRole('radio', { name: /Todos los usuarios/ }));
    await waitFor(() =>
      expect(directoryClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ tab: 'all' }),
      ),
    );
    expect(screen.getByTestId('where')).toHaveTextContent('tab=all');
  });

  it('searches as the person types (name, email or phone)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Gómez');
    await user.type(screen.getByLabelText('Buscar por nombre, correo o celular'), '310 555');
    await waitFor(() =>
      expect(directoryClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: '310 555' }),
      ),
    );
  });

  it('pages of 25 with "Anterior" and "Siguiente"', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(directoryClient.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it('only Administración gets "Exportar CSV"', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
    expect(directoryClient.exportCsv).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'players' }),
    );
  });

  it('coaches: no membership filter, no "all users" tab, no export', async () => {
    directoryClient.list.mockResolvedValue(
      PAGE({
        tabs: ['players'],
        totals: { players: 30 },
        items: [person('ana', { membershipStatus: undefined })],
      }),
    );
    renderPage(['ENTRENADOR']);
    await screen.findByText('Ana Gómez');
    expect(screen.queryByLabelText('Estado de membresía')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Todos los usuarios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();
    expect(screen.queryByText('Vencida')).not.toBeInTheDocument();
  });

  it('no serious accessibility violations', async () => {
    document.title = 'Jugadores';
    renderPage();
    await screen.findByText('Ana Gómez');
    expect(await a11yViolations()).toEqual([]);
  });
});
