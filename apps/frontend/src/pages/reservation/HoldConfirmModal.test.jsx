import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';

import { HoldConfirmModal } from './HoldConfirmModal.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { hold: vi.fn(), cancel: vi.fn(), confirm: vi.fn() },
}));

const SLOT = {
  courtId: 'court-1',
  courtName: 'Cancha 1',
  start: '2026-08-10T15:00:00.000Z',
  end: '2026-08-10T16:00:00.000Z',
};

describe('HoldConfirmModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.hold.mockResolvedValue({
      reservationId: 'res-1',
      holdExpiresAt: '2026-08-10T15:05:00.000Z',
      priceCop: null,
    });
  });

  it('holds for the caller when holderUserId is omitted', async () => {
    render(<HoldConfirmModal slot={SLOT} onClose={() => {}} onConfirmed={() => {}} />);

    await waitFor(() =>
      expect(bookingClient.hold).toHaveBeenCalledWith({
        courtId: SLOT.courtId,
        start: SLOT.start,
        end: SLOT.end,
      }),
    );
    expect(await screen.findByRole('button', { name: 'Confirmar reserva' })).toBeInTheDocument();
  });

  it('includes holderUserId in the hold payload when booking for a linked minor', async () => {
    render(
      <HoldConfirmModal
        slot={SLOT}
        holderUserId="minor-1"
        onClose={() => {}}
        onConfirmed={() => {}}
      />,
    );

    await waitFor(() =>
      expect(bookingClient.hold).toHaveBeenCalledWith({
        courtId: SLOT.courtId,
        start: SLOT.start,
        end: SLOT.end,
        holderUserId: 'minor-1',
      }),
    );
  });

  it('shows the mapped error message when the hold is rejected', async () => {
    const err = new Error('forbidden');
    err.code = 'not_authorized_to_book_for_user';
    bookingClient.hold.mockRejectedValue(err);

    render(
      <HoldConfirmModal
        slot={SLOT}
        holderUserId="minor-1"
        onClose={() => {}}
        onConfirmed={() => {}}
      />,
    );

    expect(
      await screen.findByText('No tienes autorización para reservar en nombre de esa cuenta.'),
    ).toBeInTheDocument();
  });
});
