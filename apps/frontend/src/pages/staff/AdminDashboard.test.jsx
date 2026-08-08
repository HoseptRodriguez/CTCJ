import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';

import { AdminDashboard } from './AdminDashboard.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: {
    getSchedule: vi.fn(),
    listCourts: vi.fn(),
    getMonthlyRevenue: vi.fn(),
    listPayments: vi.fn(),
  },
}));

vi.mock('../../api/billingClient.js', () => ({
  billingClient: { listInvoicesClubWide: vi.fn(), getMonthlyRevenue: vi.fn() },
}));

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { getPlayerCounts: vi.fn() },
}));

vi.mock('../../api/affiliationClient.js', () => ({
  affiliationClient: { listRequests: vi.fn() },
}));

vi.mock('../../api/guardianshipClient.js', () => ({
  guardianshipClient: { listGuardianships: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockResolvedValue({
      reservations: [
        { id: 'r1', status: 'CONFIRMED' },
        { id: 'r2', status: 'HOLD' },
        { id: 'r3', status: 'CANCELLED' },
      ],
    });
    bookingClient.listCourts.mockResolvedValue({ courts: [{ id: 'c1' }, { id: 'c2' }] });
    bookingClient.getMonthlyRevenue.mockResolvedValue({ months: [{ totalCop: 100000, count: 2 }] });
    bookingClient.listPayments.mockResolvedValue({ payments: [], totalCop: 0, count: 0 });
    billingClient.listInvoicesClubWide.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'PENDING'
          ? { invoices: [], totalCop: 250000, count: 3 }
          : { invoices: [], totalCop: 0, count: 0 },
      ),
    );
    billingClient.getMonthlyRevenue.mockResolvedValue({ months: [{ totalCop: 50000, count: 1 }] });
    membershipClient.getPlayerCounts.mockResolvedValue({
      ACTIVE: 12,
      PENDING: 1,
      OVERDUE: 2,
      INACTIVE: 0,
      SUSPENDED: 0,
      NONE: 0,
      total: 15,
    });
    affiliationClient.listRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [] });
  });

  it("shows today's reservation count (occupying statuses only)", async () => {
    renderPage();
    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(await screen.findByText('Reservas de hoy')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('computes court occupancy from active courts and operating hours', async () => {
    renderPage();
    // 2 occupying reservations / (2 courts * 17 hours) = 5.88% -> rounds to 6%.
    expect(await screen.findByText('6%')).toBeInTheDocument();
    expect(screen.getByText('2 canchas activas')).toBeInTheDocument();
  });

  it('shows pending payments total and count', async () => {
    renderPage();
    expect(await screen.findByText('Pagos pendientes')).toBeInTheDocument();
    expect(await screen.findByText(/\$\s*250\.000/)).toBeInTheDocument();
    expect(screen.getByText('3 facturas')).toBeInTheDocument();
  });

  it('shows combined court + membership revenue for the current month', async () => {
    renderPage();
    expect(await screen.findByText('Ingresos este mes')).toBeInTheDocument();
    expect(await screen.findByText(/\$\s*150\.000/)).toBeInTheDocument();
  });

  it('shows active players count out of the total', async () => {
    renderPage();
    expect(await screen.findByText('Jugadores activos')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('15 jugadores en total')).toBeInTheDocument();
  });

  it('shows pending requests count combining affiliation and guardianship', async () => {
    affiliationClient.listRequests.mockResolvedValue({
      requests: [{ id: 'a1', requestedAt: '2026-03-01T10:00:00.000Z' }],
    });
    guardianshipClient.listGuardianships.mockResolvedValue({
      guardianships: [
        { id: 'g1', requestedAt: '2026-03-01T10:00:00.000Z', minorEmail: 'menor1@example.com' },
        { id: 'g2', requestedAt: '2026-03-01T10:00:00.000Z', minorEmail: 'menor2@example.com' },
      ],
    });

    renderPage();

    expect(await screen.findByText('Solicitudes pendientes')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('shows recent activity merged from payments and requests, newest first', async () => {
    bookingClient.listPayments.mockResolvedValue({
      payments: [
        {
          id: 'p1',
          recordedAt: '2026-03-01T10:00:00.000Z',
          method: 'CASH',
          amountCop: 60000,
        },
      ],
      totalCop: 60000,
      count: 1,
    });
    billingClient.listInvoicesClubWide.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'PENDING'
          ? { invoices: [], totalCop: 250000, count: 3 }
          : {
              invoices: [
                {
                  id: 'i1',
                  paidAt: '2026-03-05T10:00:00.000Z',
                  amountCop: 100000,
                  playerFirstName: 'Ana',
                  playerLastName: 'Gomez',
                },
              ],
              totalCop: 100000,
              count: 1,
            },
      ),
    );

    renderPage();

    expect(await screen.findByText('Actividad reciente')).toBeInTheDocument();
    expect(await screen.findByText(/Pago de membresía · Ana Gomez/)).toBeInTheDocument();
    expect(await screen.findByText(/Pago de cancha registrado/)).toBeInTheDocument();
  });

  it('renders quick shortcuts to every staff module', async () => {
    renderPage();
    expect(await screen.findByText('Accesos rápidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagos' })).toHaveAttribute('href', '/staff/pagos');
    expect(screen.getByRole('link', { name: 'Finanzas' })).toHaveAttribute(
      'href',
      '/staff/finanzas',
    );
  });
});
