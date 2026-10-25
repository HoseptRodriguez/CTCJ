import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../../test/axe.js';
import { clinicalClient } from '../../api/clinicalClient.js';
import { directoryClient } from '../../api/directoryClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { PlayerFilePage } from './PlayerFilePage.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/directoryClient.js', () => ({
  directoryClient: {
    getFile: vi.fn(),
    grantPlayerRole: vi.fn(),
    revokePlayerRole: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    resendVerification: vi.fn(),
    setStaffRole: vi.fn(),
    getPlayerReservations: vi.fn(),
    getPlayerCompetition: vi.fn(),
    getPlayerTournaments: vi.fn(),
  },
}));
vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { getUserDocument: vi.fn() },
}));
vi.mock('../../api/billingClient.js', () => ({
  billingClient: { listMemberships: vi.fn(), listInvoices: vi.fn() },
}));
vi.mock('../../api/coachingClient.js', () => ({
  coachingClient: { listPlayerNotes: vi.fn() },
}));
vi.mock('../../api/clinicalClient.js', () => ({
  clinicalClient: { getPhysioSummary: vi.fn() },
}));

const FILE = {
  id: 'ana',
  firstName: 'Ana',
  lastName: 'Gómez',
  email: 'ana@example.com',
  phone: '3105551234',
  birthDate: '1990-05-02',
  avatarUrl: null,
  dominantHand: 'LEFT',
  backhand: 'TWO_HANDED',
  categories: ['TERCERA'],
  isJugador: true,
  isMinor: false,
  pendingGuardianAuthorization: false,
  active: true,
  deleted: false,
  status: 'ACTIVE',
  emailVerified: true,
  lastLoginAt: '2026-09-20T15:00:00Z',
  createdAt: '2026-01-10T15:00:00Z',
  roles: ['USUARIO', 'JUGADOR'],
  membershipStatus: 'ACTIVE',
  consents: [
    {
      type: 'PRIVACY_POLICY',
      version: '1',
      accepted: true,
      at: '2026-09-01T15:00:00Z',
      givenBy: null,
    },
  ],
  guardians: [],
  minors: [],
};

function renderAs(roles, file = FILE) {
  useAuth.mockReturnValue({ user: { id: 'me', roles } });
  directoryClient.getFile.mockResolvedValue(file);
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/staff/jugadores/${file.id}`]}>
        <Routes>
          <Route path="/staff/jugadores/:id" element={<PlayerFilePage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const tabNames = () => screen.getAllByRole('tab').map((t) => t.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  membershipClient.getUserDocument.mockResolvedValue({
    documentType: 'CC',
    documentNumber: '52123456',
  });
  clinicalClient.getPhysioSummary.mockResolvedValue({
    fitness: { status: 'FIT', recordedAt: '2026-09-01T15:00:00Z' },
  });
});

describe('Ficha del jugador', () => {
  it('Administración: every tab, the identity document and the actions', async () => {
    renderAs(['ADMINISTRADOR']);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Gómez' })).toBeInTheDocument();
    expect(tabNames()).toEqual([
      'Datos',
      'Membresía y facturas',
      'Reservas',
      'Ranking y torneos',
      'Notas y rendimiento',
      'Salud',
      'Autorizaciones',
      'Acudiente y menores',
    ]);
    expect(await screen.findByText('CC 52123456')).toBeInTheDocument();
    expect(screen.getByText('Zurdo')).toBeInTheDocument();
    expect(screen.getByText('A dos manos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar rol de jugador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar cuenta' })).toBeInTheDocument();
  });

  it('Recepción: no coaching notes, no health, no role or deactivation; sees the document', async () => {
    renderAs(['RECEPCION']);
    await screen.findByRole('heading', { level: 1, name: 'Ana Gómez' });
    expect(tabNames()).toEqual([
      'Datos',
      'Membresía y facturas',
      'Reservas',
      'Ranking y torneos',
      'Autorizaciones',
      'Acudiente y menores',
    ]);
    expect(await screen.findByText('CC 52123456')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rol de jugador/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Desactivar/ })).not.toBeInTheDocument();
  });

  it('Entrenador: sporting side only, never the identity document', async () => {
    renderAs(['ENTRENADOR'], { ...FILE, membershipStatus: undefined, consents: undefined });
    await screen.findByRole('heading', { level: 1, name: 'Ana Gómez' });
    expect(tabNames()).toEqual(['Datos', 'Ranking y torneos', 'Notas y rendimiento']);
    expect(screen.queryByText('Documento de identidad')).not.toBeInTheDocument();
    expect(membershipClient.getUserDocument).not.toHaveBeenCalled();
  });

  it('Salud shows only "Apto / No apto"', async () => {
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await user.click(await screen.findByRole('tab', { name: 'Salud' }));
    expect(await screen.findByText('Apto para jugar')).toBeInTheDocument();
    expect(
      screen.getByText(/Aquí solo se muestra si está apto o no para jugar/),
    ).toBeInTheDocument();
  });

  it('deactivating asks first, then calls the server', async () => {
    const user = userEvent.setup();
    directoryClient.deactivate.mockResolvedValue({ active: false });
    renderAs(['ADMINISTRADOR']);
    await user.click(await screen.findByRole('button', { name: 'Desactivar cuenta' }));
    expect(directoryClient.deactivate).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog', { name: '¿Desactivar la cuenta?' });
    expect(
      within(dialog).getByText(/no podrá entrar y se cerrarán sus sesiones/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, desactivar' }));
    expect(directoryClient.deactivate).toHaveBeenCalledWith('ana');
  });

  it('reception can resend the confirmation email to who never confirmed', async () => {
    const user = userEvent.setup();
    directoryClient.resendVerification.mockResolvedValue({ sent: true });
    renderAs(['RECEPCION'], { ...FILE, emailVerified: false });
    await user.click(
      await screen.findByRole('button', { name: 'Reenviar correo de confirmación' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Sí, reenviar' }));
    expect(directoryClient.resendVerification).toHaveBeenCalledWith('ana');
  });

  it('Administración: "Roles del personal" gives a coach role after confirming', async () => {
    const user = userEvent.setup();
    directoryClient.setStaffRole.mockResolvedValue({ userId: 'ana', roles: ['ENTRENADOR'] });
    renderAs(['ADMINISTRADOR']);
    const coach = await screen.findByRole('switch', { name: 'Entrenador' });
    expect(coach).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: 'Fisioterapia' })).toBeInTheDocument();
    await user.click(coach);
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/rol de Entrenador/);
    await user.click(screen.getByRole('button', { name: 'Sí, dar el rol' }));
    expect(directoryClient.setStaffRole).toHaveBeenCalledWith('ana', 'ENTRENADOR', true);
  });

  it("roles: never on one's own file, and not for reception", async () => {
    renderAs(['RECEPCION']);
    await screen.findByRole('heading', { name: /Ana Gómez/ });
    expect(screen.queryByRole('heading', { name: 'Roles del personal' })).not.toBeInTheDocument();
  });

  it('no serious accessibility violations', async () => {
    renderAs(['ADMINISTRADOR']);
    await screen.findByText('CC 52123456');
    expect(await a11yViolations()).toEqual([]);
  });
});
