import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { exportToCsv } from '../../lib/csvExport.js';

import { FinancePage } from './FinancePage.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { listPayments: vi.fn() },
}));

vi.mock('../../api/billingClient.js', () => ({
  billingClient: { listInvoicesClubWide: vi.fn() },
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

    await screen.findByText('Pagos de canchas');
    const buttons = screen.getAllByRole('button', { name: 'Exportar CSV' });
    await user.click(buttons[0]);

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
});
