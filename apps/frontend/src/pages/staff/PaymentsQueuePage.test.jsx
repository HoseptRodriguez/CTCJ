import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';

import { PaymentsQueuePage } from './PaymentsQueuePage.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: {
    getSchedule: vi.fn(),
    recordPayment: vi.fn(),
  },
}));

const SCHEDULE = {
  date: '2026-08-05',
  courts: [{ id: 'court-1', name: 'Cancha 1' }],
  reservations: [
    {
      id: 'res-unpaid',
      courtId: 'court-1',
      periodStart: '2026-08-05T15:00:00.000Z',
      periodEnd: '2026-08-05T16:00:00.000Z',
      status: 'CONFIRMED',
      priceCop: 60000,
      paymentId: null,
    },
    {
      id: 'res-paid',
      courtId: 'court-1',
      periodStart: '2026-08-05T16:00:00.000Z',
      periodEnd: '2026-08-05T17:00:00.000Z',
      status: 'CONFIRMED',
      priceCop: 60000,
      paymentId: 'payment-1',
    },
    {
      id: 'res-hold',
      courtId: 'court-1',
      periodStart: '2026-08-05T17:00:00.000Z',
      periodEnd: '2026-08-05T18:00:00.000Z',
      status: 'HOLD',
      priceCop: 60000,
      paymentId: null,
    },
  ],
};

describe('PaymentsQueuePage', () => {
  it('splits CONFIRMED reservations into unpaid and paid, ignoring non-CONFIRMED ones', async () => {
    bookingClient.getSchedule.mockResolvedValue(SCHEDULE);

    render(<PaymentsQueuePage />);

    await waitFor(() => expect(screen.getByText('Pendientes de pago (1)')).toBeInTheDocument());
    expect(screen.getByText('Pagadas (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como pagada' })).toBeInTheDocument();
  });

  it('records a payment and shows the receipt', async () => {
    bookingClient.getSchedule.mockResolvedValue(SCHEDULE);
    bookingClient.recordPayment.mockResolvedValue({
      paymentId: 'payment-2',
      amountCop: 60000,
      method: 'CASH',
      recordedAt: '2026-08-05T15:05:00.000Z',
    });

    const user = userEvent.setup();
    render(<PaymentsQueuePage />);

    await waitFor(() => expect(screen.getByText('Pendientes de pago (1)')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Marcar como pagada' }));

    await waitFor(() =>
      expect(bookingClient.recordPayment).toHaveBeenCalledWith('res-unpaid', { method: 'CASH' }),
    );
    expect(await screen.findByText('Pago registrado')).toBeInTheDocument();
  });

  it('regression: the receipt survives the refetch that moves the reservation from unpaid to paid', async () => {
    // Real bug, found via a real browser walkthrough: recording a payment
    // used to key the receipt to the reservation's spot in the *unpaid*
    // list. The refetch after a successful payment moves that reservation
    // into the *paid* list -- a different render branch -- which silently
    // dropped the receipt the instant the refetch resolved.
    const paidSchedule = {
      ...SCHEDULE,
      reservations: SCHEDULE.reservations.map((r) =>
        r.id === 'res-unpaid' ? { ...r, paymentId: 'payment-2' } : r,
      ),
    };
    bookingClient.getSchedule.mockResolvedValueOnce(SCHEDULE).mockResolvedValueOnce(paidSchedule);
    bookingClient.recordPayment.mockResolvedValue({
      paymentId: 'payment-2',
      amountCop: 60000,
      method: 'CASH',
      recordedAt: '2026-08-05T15:05:00.000Z',
    });

    const user = userEvent.setup();
    render(<PaymentsQueuePage />);

    await waitFor(() => expect(screen.getByText('Pendientes de pago (1)')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Marcar como pagada' }));

    // Wait for the post-payment refetch to land (the reservation is now
    // reclassified as paid) and assert the receipt is still on screen.
    await waitFor(() => expect(screen.getByText('Pendientes de pago (0)')).toBeInTheDocument());
    expect(screen.getByText('Pagadas (2)')).toBeInTheDocument();
    expect(screen.getByText('Pago registrado')).toBeInTheDocument();
  });
});
