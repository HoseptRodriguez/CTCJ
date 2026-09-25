import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { UiShowcase } from './UiShowcase.jsx';

function renderShowcase() {
  return render(
    <MemoryRouter>
      <UiShowcase />
    </MemoryRouter>,
  );
}

describe('UiShowcase (/dev/ui)', () => {
  it('renders every design-system section without crashing', () => {
    renderShowcase();
    expect(screen.getByRole('heading', { level: 1, name: 'Componentes base' })).toBeInTheDocument();
    for (const section of [
      'Colores',
      'Tipografía',
      'Botones',
      'Estados y cifras',
      'Tarjetas y encabezado',
      'Vacío, error y carga',
      'Pestañas y selector',
      'Confirmación y avisos',
      'Fotos del club',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
    }
  });

  it('renders the club photos lazily except the first, with Spanish alt text', () => {
    renderShowcase();
    const photos = screen
      .getAllByRole('img')
      .filter((img) => img.getAttribute('src')?.startsWith('/img/'));
    expect(photos).toHaveLength(6);
    expect(photos[0]).toHaveAttribute('loading', 'eager');
    for (const img of photos.slice(1)) expect(img).toHaveAttribute('loading', 'lazy');
    for (const img of photos) expect(img.getAttribute('alt')).toMatch(/cancha|jugador/i);
  });

  it('confirm dialog: focuses the safe button, closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    renderShowcase();
    const section = screen.getByRole('region', { name: 'Confirmación y avisos' });
    const trigger = within(section).getByRole('button', { name: 'Cancelar reserva' });

    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog', { name: '¿Cancelar la reserva?' });
    expect(within(dialog).getByRole('button', { name: 'No, volver' })).toHaveFocus();
    expect(
      within(dialog).getByRole('button', { name: 'Sí, cancelar reserva' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('tabs and segmented control move with the arrow keys', async () => {
    const user = userEvent.setup();
    renderShowcase();

    const proximas = screen.getByRole('tab', { name: 'Próximas' });
    await user.click(proximas);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Pasadas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Pasadas' })).toHaveFocus();

    await user.click(screen.getByRole('radio', { name: 'Hoy' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Mañana' })).toHaveAttribute('aria-checked', 'true');
  });

  it('error toasts stay until closed with the visible "Cerrar" button', async () => {
    const user = userEvent.setup();
    renderShowcase();

    await user.click(screen.getByRole('button', { name: 'Aviso de error' }));
    expect(screen.getByText('No se pudo guardar el pago')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByText('No se pudo guardar el pago')).not.toBeInTheDocument();
  });
});
