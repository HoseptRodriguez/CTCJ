import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScrollTrigger } from '../../lib/gsap.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { ToastProvider, useToast } from '../ui/Toast.jsx';

import { AnimatedCheck } from './AnimatedCheck.jsx';
import { AnimatedList } from './AnimatedList.jsx';
import { CountUp } from './CountUp.jsx';
import { HeroBallTrajectory } from './HeroBallTrajectory.jsx';
import { ParallaxPhoto } from './ParallaxPhoto.jsx';
import { SlidePanel } from './SlidePanel.jsx';
import { SplitHeadline } from './SplitHeadline.jsx';
import { TabTransition } from './TabTransition.jsx';

function setReducedMotion(reduced) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: reduced && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  ScrollTrigger.getAll().forEach((t) => t.kill());
  vi.restoreAllMocks();
});

/** An element shows its final state when nothing hides or displaces it. */
function expectAtRest(el) {
  expect(el.style.opacity === '' || el.style.opacity === '1').toBe(true);
  expect(['', 'none', 'translate(0px, 0px)']).toContain(el.style.transform);
}

describe('with prefers-reduced-motion: everything shows its final state, unanimated', () => {
  // No motion-on counterpart for this one: jsdom can't measure SVG paths
  // (getTotalLength), so the component keeps its final state there anyway.
  it('HeroBallTrajectory: arc fully drawn, ball resting at the end of the arc', () => {
    setReducedMotion(true);
    const { container } = render(<HeroBallTrajectory />);
    expect(container.querySelector('[data-part="ball"]')).toHaveAttribute(
      'transform',
      'translate(540 236)',
    );
    const mask = container.querySelector('[data-part="mask-path"]');
    expect(mask.style.strokeDashoffset).toBe('');
    expect(mask.style.strokeDasharray).toBe('');
  });

  it('SplitHeadline: every line in place and visible, full text readable', () => {
    setReducedMotion(true);
    render(<SplitHeadline lines={['Su club.', 'Su cancha.']} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Su club. Su cancha.');
    heading.querySelectorAll('[data-line]').forEach(expectAtRest);
  });

  it('CountUp: shows the final number right away, not 0', () => {
    setReducedMotion(true);
    const { container } = render(<CountUp value={1250} />);
    expect(container.querySelector('[data-part="count"]')).toHaveTextContent('1.250');
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });

  it('ParallaxPhoto: still photo, no scroll trigger created', () => {
    setReducedMotion(true);
    const { container } = render(<ParallaxPhoto name="accion-saque" />);
    expectAtRest(container.querySelector('[data-part="parallax-layer"]'));
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });

  it('AnimatedCheck: circle full size and check fully drawn, with its label', () => {
    setReducedMotion(true);
    const { container } = render(<AnimatedCheck label="Pago registrado" />);
    expect(screen.getByRole('img', { name: 'Pago registrado' })).toBeInTheDocument();
    expectAtRest(container.querySelector('[data-part="circle"]'));
    expect(container.querySelector('[data-part="check"]')).toHaveAttribute(
      'stroke-dasharray',
      '1px 1px',
    );
  });

  it('SlidePanel: opens already in place and disappears at once when closed', async () => {
    setReducedMotion(true);
    const { rerender } = render(
      <SlidePanel open title="Cobrar" onClose={() => {}}>
        Contenido
      </SlidePanel>,
    );
    expectAtRest(screen.getByRole('dialog', { name: 'Cobrar' }));

    rerender(
      <SlidePanel open={false} title="Cobrar" onClose={() => {}}>
        Contenido
      </SlidePanel>,
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('TabTransition: the new tab content is in place the moment it appears', async () => {
    setReducedMotion(true);
    const { rerender } = render(<TabTransition activeKey="a">Contenido A</TabTransition>);
    rerender(<TabTransition activeKey="b">Contenido B</TabTransition>);
    // Checked on first sight: with motion on it would still be fading in.
    expectAtRest(await screen.findByText('Contenido B', {}, { interval: 5 }));
  });

  it('ConfirmDialog and Toast: appear already in place', async () => {
    setReducedMotion(true);
    function ShowToast() {
      const toast = useToast();
      return <button onClick={() => toast({ title: 'Nota guardada' })}>Mostrar</button>;
    }
    render(
      <ToastProvider>
        <ShowToast />
        <ConfirmDialog
          open
          title="¿Seguro?"
          description="d"
          confirmLabel="Sí"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </ToastProvider>,
    );
    expectAtRest(screen.getByRole('alertdialog'));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Mostrar', hidden: true }));
    expectAtRest(screen.getByText('Nota guardada').closest('div.shadow-lg'));
  });
});

describe('without reduced motion: the animations really start (control)', () => {
  it('SplitHeadline starts its lines hidden below', () => {
    setReducedMotion(false);
    render(<SplitHeadline lines={['Su club.']} />);
    const line = screen.getByRole('heading').querySelector('[data-line]');
    expect(line.style.opacity).toBe('0');
    expect(line.style.transform).toContain('translate');
  });

  it('CountUp starts from 0 and waits for a scroll trigger', () => {
    setReducedMotion(false);
    const { container } = render(<CountUp value={1250} />);
    expect(container.querySelector('[data-part="count"]')).toHaveTextContent(/^0$/);
    expect(ScrollTrigger.getAll()).toHaveLength(1);
  });

  it('ParallaxPhoto registers exactly one scroll trigger, and removes it on unmount', () => {
    setReducedMotion(false);
    const { unmount } = render(<ParallaxPhoto name="accion-saque" />);
    expect(ScrollTrigger.getAll()).toHaveLength(1);
    unmount();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });

  it('AnimatedCheck starts undrawn', () => {
    setReducedMotion(false);
    const { container } = render(<AnimatedCheck label="Listo" />);
    expect(
      container.querySelector('[data-part="check"]').getAttribute('stroke-dasharray'),
    ).not.toBe('1px 1px');
  });
});

describe('modal focus with exit animations (regression)', () => {
  // react-dom restores the pre-commit focus after each commit if that element
  // is still in the DOM -- which it is while a panel animates out. Focus must
  // still land back on the opener immediately.
  it('SlidePanel gives focus back to its opener at once, while still animating out', async () => {
    setReducedMotion(false);
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Cobrar reserva</button>
          <SlidePanel open={open} title="Cobrar" onClose={() => setOpen(false)}>
            Contenido
          </SlidePanel>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Cobrar reserva' });

    await user.click(opener);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});

describe('AnimatedList keeps the correct order', () => {
  const renderList = (items) => (
    <AnimatedList
      aria-label="Pagos"
      items={items}
      getKey={(i) => i.id}
      renderItem={(i) => i.name}
    />
  );
  const order = () =>
    [...screen.getByRole('list', { name: 'Pagos' }).querySelectorAll('li')]
      .filter((li) => li.style.opacity !== '0' || !li.style.transform.includes('translateX'))
      .map((li) => li.dataset.key);

  it.each([
    ['with animation', false],
    ['with reduced motion', true],
  ])('renders, reorders and removes items in the given order (%s)', async (_label, reduced) => {
    setReducedMotion(reduced);
    const a = { id: 'a', name: 'Cancha 1' };
    const b = { id: 'b', name: 'Cancha 2' };
    const c = { id: 'c', name: 'Cancha 3' };
    const { rerender } = render(renderList([a, b, c]));
    expect(order()).toEqual(['a', 'b', 'c']);

    rerender(renderList([c, a, b]));
    expect(order()).toEqual(['c', 'a', 'b']);

    rerender(renderList([c, a]));
    await waitFor(() =>
      expect(
        [...screen.getByRole('list').querySelectorAll('li')].map((li) => li.dataset.key),
      ).toEqual(['c', 'a']),
    );

    rerender(renderList([c, a, b]));
    expect(order()).toEqual(['c', 'a', 'b']);
  });
});
