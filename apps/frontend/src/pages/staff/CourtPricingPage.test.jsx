import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';

import { CourtPricingPage } from './CourtPricingPage.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: {
    listCourts: vi.fn(),
    setCourtPrice: vi.fn(),
  },
}));

describe('CourtPricingPage', () => {
  it('renders courts with their current price, or "sin precio" when unset', async () => {
    bookingClient.listCourts.mockResolvedValue({
      courts: [
        { id: 'court-1', name: 'Cancha 1', priceCop: 60000 },
        { id: 'court-2', name: 'Cancha 2', priceCop: null },
      ],
    });

    render(<CourtPricingPage />);

    await waitFor(() => expect(screen.getByText('Cancha 1')).toBeInTheDocument());
    expect(screen.getByText(/Precio actual: \$60.000/)).toBeInTheDocument();
    expect(screen.getByText('Cancha 2')).toBeInTheDocument();
    expect(screen.getByText('Sin precio configurado')).toBeInTheDocument();
  });

  it('saves a new price and shows a confirmation', async () => {
    bookingClient.listCourts.mockResolvedValue({
      courts: [{ id: 'court-1', name: 'Cancha 1', priceCop: null }],
    });
    bookingClient.setCourtPrice.mockResolvedValue({ courtId: 'court-1', priceCop: 70000 });

    const user = userEvent.setup();
    render(<CourtPricingPage />);

    await waitFor(() => expect(screen.getByText('Cancha 1')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Precio por hora en pesos'), '70000');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(bookingClient.setCourtPrice).toHaveBeenCalledWith('court-1', 70000));
    expect(await screen.findByText('Precio actualizado.')).toBeInTheDocument();
  });
});
