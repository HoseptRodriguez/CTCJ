import { render, screen, waitFor, within } from '@testing-library/react';
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

describe('FinancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.listPayments.mockResolvedValue(COURT_PAYMENTS);
    billingClient.listInvoicesClubWide.mockImplementation(({ status }) =>
      Promise.resolve(status === 'PENDING' ? CARTERA : MEMBERSHIP_PAYMENTS),
    );
    // Deliberately distinct from COURT_PAYMENTS/MEMBERSHIP_PAYMENTS' totals
    // below (60.000/100.000/160.000) -- CashFlowChart renders real SVG text
    // nodes for its axis ticks, and a colliding value would make those
    // sections' own subtotal assertions ambiguous.
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

  it('renders both payment sections with subtotals and a combined total', async () => {
    render(<FinancePage />);

    expect(await screen.findByText('Pagos de canchas')).toBeInTheDocument();
    expect(await screen.findByText('Pagos de membresías')).toBeInTheDocument();
    // Subtotals: $ 60.000 (canchas) and $ 100.000 (membresías); combined = $ 160.000.
    expect(screen.getAllByText(/\$\s*60\.000/)).toHaveLength(2); // subtotal + the one row
    expect(screen.getAllByText(/\$\s*100\.000/)).toHaveLength(2);
    expect(screen.getByText(/\$\s*160\.000/)).toBeInTheDocument();
  });

  it('shows the cartera section with an overdue badge', async () => {
    render(<FinancePage />);

    expect(await screen.findByText(/Luis Ruiz/)).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });

  it('exports court payments to CSV on click', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);

    const heading = await screen.findByText('Pagos de canchas');
    const section = within(heading.closest('div'));
    await user.click(await section.findByRole('button', { name: 'Exportar CSV' }));

    expect(exportToCsv).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'pagos-canchas.csv', rows: COURT_PAYMENTS.payments }),
    );
  });

  it('refetches when the date range changes', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);

    await waitFor(() => expect(bookingClient.listPayments).toHaveBeenCalledTimes(1));

    const fromInput = screen.getByLabelText('Desde');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-01-01');

    await waitFor(() =>
      expect(bookingClient.listPayments).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-01-01' }),
      ),
    );
  });

  it('shows the cash flow section, defaulting to 6 months', async () => {
    render(<FinancePage />);

    await screen.findByText('Flujo de caja');
    await waitFor(() =>
      expect(bookingClient.getMonthlyRevenue).toHaveBeenCalledWith({ months: 6 }),
    );
    await waitFor(() =>
      expect(billingClient.getMonthlyRevenue).toHaveBeenCalledWith({ months: 6 }),
    );
  });

  it('refetches cash flow when the months selector changes', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);

    await screen.findByText('Flujo de caja');
    await waitFor(() => expect(bookingClient.getMonthlyRevenue).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText('Meses'), '12');

    await waitFor(() =>
      expect(bookingClient.getMonthlyRevenue).toHaveBeenLastCalledWith({ months: 12 }),
    );
    await waitFor(() =>
      expect(billingClient.getMonthlyRevenue).toHaveBeenLastCalledWith({ months: 12 }),
    );
  });

  it('exports cash flow to CSV, merging court and membership totals per month', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);

    const heading = await screen.findByText('Flujo de caja');
    const section = within(heading.closest('div'));
    await user.click(await section.findByRole('button', { name: 'Exportar CSV' }));

    expect(exportToCsv).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'flujo-de-caja.csv',
        rows: [
          { month: '2026-01', courtCop: 12345, membershipCop: 34567 },
          { month: '2026-02', courtCop: 23456, membershipCop: 45678 },
        ],
      }),
    );
  });
});
