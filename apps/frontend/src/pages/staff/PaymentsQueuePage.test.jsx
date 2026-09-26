import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { PaymentsQueuePage } from './PaymentsQueuePage.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { getSchedule: vi.fn(), listPayments: vi.fn(), recordPayment: vi.fn() },
}));

const base = {
  courtId: 'court-1',
  status: 'CONFIRMED',
  reservationType: 'PRIVATE',
  priceCop: 60000,
};
const SCHEDULE = {
  date: '2026-08-05',
  courts: [{ id: 'court-1', name: 'Cancha 1' }],
  reservations: [
    {
      ...base,
      id: 'res-unpaid',
      periodStart: '2026-08-05T15:00:00.000Z',
      periodEnd: '2026-08-05T16:00:00.000Z',
      paymentId: null,
      holderName: 'Tomás Rey',
      bookedByOther: true,
      createdByName: 'Clara Rey',
      holderMembershipStatus: 'ACTIVE',
    },
    {
      ...base,
      id: 'res-unpaid-2',
      periodStart: '2026-08-05T18:00:00.000Z',
      periodEnd: '2026-08-05T19:00:00.000Z',
      paymentId: null,
      holderName: 'Ana Ruiz',
      bookedByOther: false,
    },
    {
      ...base,
      id: 'res-paid',
      periodStart: '2026-08-05T16:00:00.000Z',
      periodEnd: '2026-08-05T17:00:00.000Z',
      paymentId: 'payment-1',
      holderName: 'Luis Gómez',
    },
    {
      ...base,
      id: 'res-class',
      reservationType: 'CLASS',
      periodStart: '2026-08-05T20:00:00.000Z',
      periodEnd: '2026-08-05T21:00:00.000Z',
      paymentId: null,
      holderName: 'Clase academia',
    },
    {
      ...base,
      id: 'res-hold',
      periodStart: '2026-08-05T17:00:00.000Z',
      periodEnd: '2026-08-05T18:00:00.000Z',
      status: 'HOLD',
      paymentId: null,
      holderName: 'En espera',
    },
  ],
};

function renderPage() {
  return render(
    <ToastProvider>
      <PaymentsQueuePage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  bookingClient.getSchedule.mockResolvedValue(SCHEDULE);
  bookingClient.listPayments.mockResolvedValue({
    payments: [
      {
        id: 'payment-1',
        reservationId: 'res-paid',
        amountCop: 60000,
        method: 'TRANSFER',
        recordedAt: '2026-08-05T16:05:00.000Z',
      },
    ],
  });
  bookingClient.recordPayment.mockResolvedValue({
    paymentId: 'payment-2',
    reservationId: 'res-unpaid',
    amountCop: 60000,
    method: 'CARD_IN_PERSON',
    recordedAt: '2026-08-05T15:05:00.000Z',
  });
});

describe('PaymentsQueuePage (Cobros)', () => {
  it('splits CONFIRMED reservations into "Sin pagar" and "Pagadas", ignoring holds and classes', async () => {
    renderPage();
    expect(await screen.findByRole('radio', { name: 'Sin pagar (2)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pagadas (1)' })).toBeInTheDocument();
    expect(screen.queryByText('En espera')).not.toBeInTheDocument();
    // Classes are paid in the academy's monthly fee.
    expect(screen.queryByText('Clase academia')).not.toBeInTheDocument();
  });

  it('each row: who, that a guardian booked it, the value and a "Cobrar" button', async () => {
    renderPage();
    const list = await screen.findByRole('list', { name: 'Reservas sin pagar' });
    expect(within(list).getByText('Tomás Rey')).toBeInTheDocument();
    expect(within(list).getByText('La reservó su acudiente, Clara Rey')).toBeInTheDocument();
    expect(within(list).getAllByText('$ 60.000')).toHaveLength(2);
    expect(within(list).getAllByRole('button', { name: 'Cobrar' })).toHaveLength(2);
  });

  it('charges with a frozen value and a chosen method, then offers print and "Siguiente cobro"', async () => {
    const user = userEvent.setup();
    renderPage();
    const list = await screen.findByRole('list', { name: 'Reservas sin pagar' });
    await user.click(within(list).getAllByRole('button', { name: 'Cobrar' })[0]);

    const panel = await screen.findByRole('dialog', { name: 'Cobrar a Tomás Rey' });
    // The value is shown, not an input.
    expect(within(panel).getByText('$ 60.000')).toBeInTheDocument();
    expect(within(panel).queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument();

    // Asks for a method first.
    await user.click(within(panel).getByRole('button', { name: 'Marcar como pagada' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent('Elige cómo pagó.');
    expect(bookingClient.recordPayment).not.toHaveBeenCalled();

    await user.click(within(panel).getByRole('radio', { name: 'Tarjeta en el club' }));
    await user.click(within(panel).getByRole('button', { name: 'Marcar como pagada' }));
    expect(bookingClient.recordPayment).toHaveBeenCalledWith('res-unpaid', {
      method: 'CARD_IN_PERSON',
    });

    const done = await screen.findByRole('dialog', { name: 'Pago registrado' });
    expect(within(done).getByRole('button', { name: 'Imprimir recibo' })).toBeInTheDocument();
    expect(within(done).getByText('Tarjeta en el club')).toBeInTheDocument();

    // The row moved to "Pagadas" while the success state stays on screen.
    expect(screen.getByRole('radio', { name: 'Sin pagar (1)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pagadas (2)' })).toBeInTheDocument();
    expect(bookingClient.getSchedule).toHaveBeenCalledTimes(1);

    await user.click(within(done).getByRole('button', { name: 'Siguiente cobro' }));
    expect(await screen.findByRole('dialog', { name: 'Cobrar a Ana Ruiz' })).toBeInTheDocument();
  });

  it('"Imprimir recibo" prints a receipt with the payment details', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('radio', { name: 'Pagadas (1)' }));
    await user.click(await screen.findByRole('button', { name: 'Recibo' }));
    await waitFor(() => expect(printSpy).toHaveBeenCalled());
    const receipt = document.querySelector('.receipt-print');
    expect(receipt).toHaveTextContent('Luis Gómez');
    expect(receipt).toHaveTextContent('Transferencia');
    expect(receipt).toHaveTextContent('$ 60.000');
    printSpy.mockRestore();
  });

  it('shows a clear message when the payment fails', async () => {
    bookingClient.recordPayment.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, code: 'RESERVATION_ALREADY_PAID' }),
    );
    const user = userEvent.setup();
    renderPage();
    const list = await screen.findByRole('list', { name: 'Reservas sin pagar' });
    await user.click(within(list).getAllByRole('button', { name: 'Cobrar' })[0]);
    const panel = await screen.findByRole('dialog', { name: 'Cobrar a Tomás Rey' });
    await user.click(within(panel).getByRole('radio', { name: 'Efectivo' }));
    await user.click(within(panel).getByRole('button', { name: 'Marcar como pagada' }));
    expect(await within(panel).findByRole('alert')).toBeInTheDocument();
  });
});
