import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { communityAdminClient } from '../../api/communityAdminClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { AdminDashboard } from './AdminDashboard.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { getSchedule: vi.fn(), getMonthlyRevenue: vi.fn(), listPayments: vi.fn() },
}));
vi.mock('../../api/billingClient.js', () => ({
  billingClient: { listInvoicesClubWide: vi.fn(), getMonthlyRevenue: vi.fn() },
}));
vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { getPlayerCounts: vi.fn(), getMyProfile: vi.fn() },
}));
vi.mock('../../api/affiliationClient.js', () => ({ affiliationClient: { listRequests: vi.fn() } }));
vi.mock('../../api/guardianshipClient.js', () => ({
  guardianshipClient: { listGuardianships: vi.fn() },
}));
vi.mock('../../api/communityAdminClient.js', () => ({
  communityAdminClient: { listReports: vi.fn() },
}));

const recently = new Date(Date.now() - 86_400_000).toISOString();

function renderPage(roles = ['ADMINISTRADOR']) {
  useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', ...roles] } });
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  membershipClient.getMyProfile.mockResolvedValue({ firstName: 'Marta' });
  bookingClient.getSchedule.mockResolvedValue({
    courts: [
      { id: 'c1', name: 'Cancha 1' },
      { id: 'c2', name: 'Cancha 2' },
    ],
    reservations: [
      {
        id: 'r1',
        courtId: 'c1',
        status: 'CONFIRMED',
        reservationType: 'PRIVATE',
        paymentId: null,
        priceCop: 35000,
        holderName: 'Ana Ruiz',
        periodStart: '2026-09-25T12:00:00Z',
        periodEnd: '2026-09-25T13:00:00Z',
      },
      {
        id: 'r2',
        courtId: 'c1',
        status: 'CONFIRMED',
        reservationType: 'PRIVATE',
        paymentId: 'p1',
        priceCop: 35000,
        holderName: 'Luis Gómez',
        periodStart: '2026-09-25T14:00:00Z',
        periodEnd: '2026-09-25T15:00:00Z',
      },
      {
        id: 'r3',
        courtId: 'c2',
        status: 'CONFIRMED',
        reservationType: 'CLASS',
        paymentId: null,
        priceCop: 40000,
        periodStart: '2026-09-25T21:00:00Z',
        periodEnd: '2026-09-25T22:00:00Z',
      },
    ],
  });
  bookingClient.getMonthlyRevenue.mockResolvedValue({ months: [{ totalCop: 100000, count: 2 }] });
  billingClient.getMonthlyRevenue.mockResolvedValue({ months: [{ totalCop: 50000, count: 1 }] });
  bookingClient.listPayments.mockResolvedValue({
    payments: [{ id: 'p1', amountCop: 35000, recordedAt: recently }],
  });
  billingClient.listInvoicesClubWide.mockResolvedValue({
    invoices: [
      {
        id: 'i1',
        amountCop: 120000,
        paidAt: recently,
        playerFirstName: 'Sofía',
        playerLastName: 'Paz',
      },
    ],
  });
  membershipClient.getPlayerCounts.mockResolvedValue({ ACTIVE: 12, OVERDUE: 2, total: 15 });
  affiliationClient.listRequests.mockResolvedValue({
    requests: [{ id: 'a1', requestedAt: recently }],
  });
  guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [] });
  communityAdminClient.listReports.mockResolvedValue({ reports: [] });
});

describe('AdminDashboard (panel de Admin/Recepción)', () => {
  it('greets the person by name', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: /, Marta$/ })).toBeInTheDocument();
  });

  it('"Para hacer hoy": unpaid reservations → Cobrar, requests → Revisar, no reports → all clear', async () => {
    renderPage();
    const todo = (await screen.findByRole('heading', { name: 'Para hacer hoy' })).closest(
      'section',
    );
    // Only r1: the class r3 is paid in the monthly fee, not at the desk.
    expect(await within(todo).findByText('reserva sin pagar')).toBeInTheDocument();
    expect(within(todo).getByRole('link', { name: 'Cobrar' })).toHaveAttribute(
      'href',
      '/staff/pagos',
    );
    expect(await within(todo).findByText('solicitud por revisar')).toBeInTheDocument();
    expect(within(todo).getByRole('link', { name: 'Revisar' })).toHaveAttribute(
      'href',
      '/staff/solicitudes',
    );
    expect(await within(todo).findByText('No hay reportes en la comunidad')).toBeInTheDocument();
    expect(within(todo).getByRole('link', { name: 'Moderar' })).toBeInTheDocument();
  });

  it('Recepción never asks for the admin-only requests', async () => {
    renderPage(['RECEPCION']);
    await screen.findByText('Para hacer hoy');
    expect(screen.queryByRole('link', { name: 'Revisar' })).not.toBeInTheDocument();
    expect(affiliationClient.listRequests).not.toHaveBeenCalled();
    expect(guardianshipClient.listGuardianships).not.toHaveBeenCalled();
  });

  it('shows the 4 figures: reservations + occupancy, to charge, month income, players by state', async () => {
    renderPage();
    const stats = await screen.findByRole('region', { name: 'Cifras del club' });
    // 3 hours booked out of 2 courts × 17 hours.
    expect(await within(stats).findByText('9 % de ocupación')).toBeInTheDocument();
    expect(within(stats).getByText('3')).toBeInTheDocument();
    expect(within(stats).getByText('$ 35.000')).toBeInTheDocument();
    expect(await within(stats).findByText('$ 150.000')).toBeInTheDocument();
    expect(await within(stats).findByText('15')).toBeInTheDocument();
    expect(within(stats).getByText('12 al día · 2 con pago vencido')).toBeInTheDocument();
  });

  it('players: 0 "al día" and 2 overdue never contradict each other', async () => {
    membershipClient.getPlayerCounts.mockResolvedValue({
      ACTIVE: 0,
      OVERDUE: 2,
      NONE: 23,
      total: 25,
    });
    renderPage();
    const stats = await screen.findByRole('region', { name: 'Cifras del club' });
    expect(await within(stats).findByText('25')).toBeInTheDocument();
    expect(
      within(stats).getByText('0 al día · 2 con pago vencido · 23 sin membresía'),
    ).toBeInTheDocument();
    expect(within(stats).queryByText(/Jugadores activos/)).not.toBeInTheDocument();
  });

  it('a zero because there is no data yet shows a useful sentence, not a bare "0"', async () => {
    bookingClient.getSchedule.mockResolvedValue({
      courts: [{ id: 'c1', name: 'Cancha 1' }],
      reservations: [],
    });
    bookingClient.getMonthlyRevenue.mockResolvedValue({ months: [] });
    billingClient.getMonthlyRevenue.mockResolvedValue({ months: [] });
    membershipClient.getPlayerCounts.mockResolvedValue({ ACTIVE: 0, OVERDUE: 0, total: 0 });
    renderPage();
    const stats = await screen.findByRole('region', { name: 'Cifras del club' });
    expect(await within(stats).findByText('Aún no hay reservas hoy')).toBeInTheDocument();
    expect(within(stats).getByText('Nada por cobrar hoy')).toBeInTheDocument();
    expect(await within(stats).findByText('Aún no hay ingresos este mes')).toBeInTheDocument();
    expect(await within(stats).findByText('Aún no hay jugadores registrados')).toBeInTheDocument();
    expect(within(stats).queryByText('0')).not.toBeInTheDocument();
  });

  it('"Canchas hoy" lists every court with who booked and the classes (phone layout)', async () => {
    renderPage();
    const courts = (await screen.findByRole('heading', { name: 'Canchas hoy' })).closest('section');
    expect(await within(courts).findByText('Cancha 1')).toBeInTheDocument();
    expect(within(courts).getByText(/Reserva · Ana Ruiz/)).toBeInTheDocument();
    expect(within(courts).getByText('Clase')).toBeInTheDocument();
  });

  it('"Últimos 7 días" mixes court payments, membership payments and requests', async () => {
    renderPage();
    expect(await screen.findByText('Pago de cancha por $ 35.000')).toBeInTheDocument();
    expect(screen.getByText('Sofía Paz pagó su membresía ($ 120.000)')).toBeInTheDocument();
    expect(screen.getByText('Nueva solicitud de afiliación')).toBeInTheDocument();
  });

  it('a failing schedule shows an error with retry, and the rest of the panel still loads', async () => {
    bookingClient.getSchedule.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByText('No pudimos cargar la agenda de hoy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(await screen.findByText('Pago de cancha por $ 35.000')).toBeInTheDocument();
  });
});
