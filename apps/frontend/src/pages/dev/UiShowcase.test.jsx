import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const region = (name) => within(screen.getByRole('region', { name }));

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
      'Animaciones',
      'Fotos del club',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument();
    }
  });

  it('renders the club photos lazily except the first, with Spanish alt text', () => {
    renderShowcase();
    const photos = region('Fotos del club')
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
    const trigger = region('Confirmación y avisos').getByRole('button', {
      name: 'Cancelar reserva',
    });

    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog', { name: '¿Cancelar la reserva?' });
    expect(within(dialog).getByRole('button', { name: 'No, volver' })).toHaveFocus();
    expect(
      within(dialog).getByRole('button', { name: 'Sí, cancelar reserva' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    // Focus returns at once -- it doesn't wait for the exit animation.
    expect(trigger).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('tabs and segmented control move with the arrow keys', async () => {
    const user = userEvent.setup();
    renderShowcase();
    const section = region('Pestañas y selector');

    await user.click(section.getByRole('tab', { name: 'Próximas' }));
    await user.keyboard('{ArrowRight}');
    expect(section.getByRole('tab', { name: 'Pasadas' })).toHaveAttribute('aria-selected', 'true');
    expect(section.getByRole('tab', { name: 'Pasadas' })).toHaveFocus();

    await user.click(section.getByRole('radio', { name: 'Hoy' }));
    await user.keyboard('{ArrowRight}');
    expect(section.getByRole('radio', { name: 'Mañana' })).toHaveAttribute('aria-checked', 'true');
  });

  it('error toasts stay until closed with the visible "Cerrar" button', async () => {
    const user = userEvent.setup();
    renderShowcase();

    await user.click(screen.getByRole('button', { name: 'Aviso de error' }));
    expect(screen.getByText('No se pudo guardar el pago')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() =>
      expect(screen.queryByText('No se pudo guardar el pago')).not.toBeInTheDocument(),
    );
  });

  it('animations section: every demo has a "Repetir" button', () => {
    renderShowcase();
    const section = region('Animaciones');
    const demos = [
      'HeroBallTrajectory',
      'SplitHeadline',
      'CountUp',
      'AnimatedCheck',
      'SlidePanel',
      'AnimatedList',
      'TabTransition',
      'Toast y ConfirmDialog',
      'ParallaxPhoto',
    ];
    for (const demo of demos) {
      expect(section.getByRole('heading', { level: 3, name: demo })).toBeInTheDocument();
    }
    expect(section.getAllByRole('button', { name: 'Repetir' })).toHaveLength(demos.length);
  });

  it('animated list demo: "Marcar como pagada" moves the item to "Pagadas"', async () => {
    const user = userEvent.setup();
    renderShowcase();
    const section = region('Animaciones');
    const pending = () => within(section.getByRole('list', { name: 'Sin pagar' }));
    const paid = () => within(section.getByRole('list', { name: 'Pagadas' }));

    await user.click(pending().getAllByRole('button', { name: 'Marcar como pagada' })[0]);

    await waitFor(() => expect(paid().getByText('Cancha 1 · 6:00 a. m.')).toBeInTheDocument());
    await waitFor(() =>
      expect(pending().queryByText('Cancha 1 · 6:00 a. m.')).not.toBeInTheDocument(),
    );
  });
});
