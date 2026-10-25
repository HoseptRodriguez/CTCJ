import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { exportToCsv } from '../../lib/csvExport.js';

import { FinancePage } from './FinancePage.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { listPayments: vi.fn(), getMonthlyRevenue: vi.fn() },
}));

vi.mock('../../api/billingClient.js', () => ({
  billingClient: { listInvoicesClubWide: vi.fn(), getMonthlyRevenue: vi.fn() },
}));

vi.mock('../../lib/csvExport.js', () => ({
  exportToCsv: vi.fn(),
}));

const COURT_PAYMENTS = {
  payments: [
    { id: 'pay-1', recordedAt: '2026-03-10T12:00:00.000Z', method: 'CASH', amountCop: 60000 },
  ],
  totalCop: 60000,
  count: 1,
};

const MEMBERSHIP_PAYMENTS = {
  invoices: [
    {
      id: 'inv-1',
      paidAt: '2026-03-11T12:00:00.000Z',
      paidMethod: 'TRANSFER',
      amountCop: 100000,
      playerFirstName: 'Ana',
      playerLastName: 'Gomez',
    },
  ],
  totalCop: 100000,
  count: 1,
};

const CARTERA = {
  invoices: [
    {
      id: 'inv-2',
      dueDate: '2026-01-01',
      amountCop: 50000,
      isOverdue: true,
      playerFirstName: 'Luis',
      playerLastName: 'Ruiz',
    },
  ],
  totalCop: 50000,
  count: 1,
};

const section = (name) => screen.getByRole('heading', { name }).closest('section');

describe('FinancePage (Finanzas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.listPayments.mockResolvedValue(COURT_PAYMENTS);
    billingClient.listInvoicesClubWide.mockImplementation(({ status }) =>
      Promise.resolve(status === 'PENDING' ? CARTERA : MEMBERSHIP_PAYMENTS),
    );
    bookingClient.getMonthlyRevenue.mockResolvedValue({
      months: [
        { month: '2026-01', totalCop: 12345, count: 2 },
        { month: '2026-02', totalCop: 23456, count: 3 },
      ],
    });
    billingClient.getMonthlyRevenue.mockResolvedValue({
      months: [
        { month: '2026-01', totalCop: 34567, count: 1 },
        { month: '2026-02', totalCop: 45678, count: 2 },
      ],
    });
  });

  it('shows the big total of the period and each source', async () => {
    render(<FinancePage />);
    const total = await screen.findByRole('region', { name: 'Total del período' });
    expect(await within(total).findByText('$ 160.000')).toBeInTheDocument();
    expect(within(total).getByText('Canchas $ 60.000 · Membresías $ 100.000')).toBeInTheDocument();
  });

  it('lists court and membership payments', async () => {
    render(<FinancePage />);
    await screen.findByText('Ana Gomez');
    expect(within(section('Pagos de canchas')).getByText('Efectivo')).toBeInTheDocument();
    expect(within(section('Pagos de membresías')).getByText(/Transferencia/)).toBeInTheDocument();
  });

  it('"Cartera" shows who owes, with a "Vencida" badge', async () => {
    render(<FinancePage />);
    expect(await screen.findByText('Luis Ruiz')).toBeInTheDocument();
    expect(within(section('Cartera')).getByText('Vencida')).toBeInTheDocument();
  });

  it('every section has "Descargar CSV"', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);
    await screen.findByText('Luis Ruiz');
    await user.click(
      within(section('Pagos de canchas')).getByRole('button', { name: 'Descargar CSV' }),
    );
    expect(exportToCsv).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: COURT_PAYMENTS.payments }),
    );
    await user.click(
      within(section('Pagos de membresías')).getByRole('button', { name: 'Descargar CSV' }),
    );
    expect(exportToCsv).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: MEMBERSHIP_PAYMENTS.invoices }),
    );
    await user.click(within(section('Cartera')).getByRole('button', { name: 'Descargar CSV' }));
    expect(exportToCsv).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: CARTERA.invoices }),
    );
  });

  it('range presets and custom dates refetch the payments', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);
    await waitFor(() => expect(bookingClient.listPayments).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('radio', { name: 'Mes pasado' }));
    await waitFor(() => expect(bookingClient.listPayments).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('radio', { name: 'Otras fechas' }));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-01' } });
    await waitFor(() =>
      expect(bookingClient.listPayments).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-01-01' }),
      ),
    );
  });

  it('cash flow: 6 months by default, 3/6/12 selector, and CSV per month', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);
    await waitFor(() =>
      expect(bookingClient.getMonthlyRevenue).toHaveBeenCalledWith({ months: 6 }),
    );
    expect(billingClient.getMonthlyRevenue).toHaveBeenCalledWith({ months: 6 });

    const flow = section('Flujo de caja');
    // The figures are also in a readable table.
    expect(await within(flow).findByRole('table')).toBeInTheDocument();
    await user.click(within(flow).getByRole('button', { name: 'Descargar CSV' }));
    expect(exportToCsv).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rows: [
          { month: '2026-01', courtCop: 12345, membershipCop: 34567 },
          { month: '2026-02', courtCop: 23456, membershipCop: 45678 },
        ],
      }),
    );

    await user.click(within(flow).getByRole('radio', { name: '12 meses' }));
    await waitFor(() =>
      expect(bookingClient.getMonthlyRevenue).toHaveBeenLastCalledWith({ months: 12 }),
    );
  });
});
