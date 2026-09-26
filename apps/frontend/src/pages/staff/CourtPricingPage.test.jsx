import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../../api/bookingClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { CourtPricingPage } from './CourtPricingPage.jsx';

vi.mock('../../api/bookingClient.js', () => ({
  bookingClient: { listCourts: vi.fn(), setCourtPrice: vi.fn() },
}));

function renderPage() {
  return render(
    <ToastProvider>
      <CourtPricingPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  bookingClient.listCourts.mockResolvedValue({
    courts: [
      { id: 'court-1', name: 'Cancha 1', priceCop: 60000 },
      { id: 'court-2', name: 'Cancha 2', priceCop: null },
    ],
  });
});

describe('CourtPricingPage (Precios de canchas)', () => {
  it('shows each court with its price per hour, or that it has none', async () => {
    renderPage();
    expect(await screen.findByText('$ 60.000 por hora')).toBeInTheDocument();
    expect(screen.getByText('Sin precio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poner precio' })).toBeInTheDocument();
  });

  it('changes a price from the side panel after confirming', async () => {
    bookingClient.setCourtPrice.mockResolvedValue({ courtId: 'court-1', priceCop: 70000 });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cambiar precio' }));

    const panel = await screen.findByRole('dialog', { name: 'Precio de Cancha 1' });
    const input = within(panel).getByLabelText(/Nuevo precio por hora/);
    await user.clear(input);
    await user.type(input, '70.000');
    expect(within(panel).getByText('Quedaría en $ 70.000')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Guardar precio' }));
    expect(bookingClient.setCourtPrice).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog', {
      name: '¿Cambiar el precio de Cancha 1?',
    });
    expect(dialog).toHaveTextContent('Pasa de $ 60.000 a $ 70.000 por hora');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cambiar precio' }));

    await waitFor(() => expect(bookingClient.setCourtPrice).toHaveBeenCalledWith('court-1', 70000));
    expect(await screen.findByText('$ 70.000 por hora')).toBeInTheDocument();
  });

  it('rejects an empty price without calling the server', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Poner precio' }));
    const panel = await screen.findByRole('dialog', { name: 'Precio de Cancha 2' });
    await user.click(within(panel).getByRole('button', { name: 'Guardar precio' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent('Escribe el precio en pesos');
    expect(bookingClient.setCourtPrice).not.toHaveBeenCalled();
  });
});
