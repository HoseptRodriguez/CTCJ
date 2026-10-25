import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../api/bookingClient.js';
import { infoRequestClient } from '../api/infoRequestClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { HomePage } from './HomePage.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/infoRequestClient.js', () => ({
  infoRequestClient: { getFormToken: vi.fn(), submit: vi.fn() },
}));
vi.mock('../api/bookingClient.js', () => ({
  bookingClient: { getCourts: vi.fn(), getPublicSchedule: vi.fn(), getSchedule: vi.fn() },
}));

// A controllable IntersectionObserver: the test says what is on screen.
let observers = [];
class FakeObserver {
  constructor(cb) {
    this.cb = cb;
    this.targets = [];
    observers.push(this);
  }
  observe(el) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {}
}
const original = globalThis.IntersectionObserver;

function show(visible) {
  act(() => {
    for (const o of observers) {
      o.cb(o.targets.map((target) => ({ target, isIntersecting: visible(target) })));
    }
  });
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
      <footer>Pie</footer>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  observers = [];
  globalThis.IntersectionObserver = FakeObserver;
  useAuth.mockReturnValue({ status: 'anonymous', user: null });
  infoRequestClient.getFormToken.mockResolvedValue({ formToken: 't' });
  for (const fn of Object.values(bookingClient)) {
    fn.mockResolvedValue({ courts: [], reservations: [], date: '2026-09-29' });
  }
});
afterEach(() => {
  globalThis.IntersectionObserver = original;
});

describe('HomePage', () => {
  it('sections in order: hero, ¿Qué quieres hacer hoy?, programs, El club, form + contact', () => {
    renderHome();
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    // "Libre hoy" is the hero's side card.
    expect(h2).toEqual([
      'Libre hoy',
      '¿Qué quieres hacer hoy?',
      'Clases y academia',
      'El club',
      'Solicitar información',
      '¿Prefieres escribirnos?',
    ]);
  });

  it('three program cards link to their pages', () => {
    renderHome();
    for (const slug of ['adultos', 'escuela-infantil', 'competencia']) {
      expect(
        screen.getAllByRole('link').some((a) => a.getAttribute('href') === `/programas/${slug}`),
      ).toBe(true);
    }
  });

  it('CountUp only for real figures: 3 canchas, 2 con iluminación', () => {
    renderHome();
    expect(screen.getByText('canchas de arcilla').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('con iluminación').nextSibling).toHaveTextContent('2');
  });

  it('the phone "Reservar cancha" bar appears after the hero and hides over the footer', () => {
    renderHome();
    const hero = document.getElementById('inicio');
    const footer = document.querySelector('footer');
    const bar = () => screen.queryByRole('link', { name: 'Reservar cancha' });
    expect(bar()).not.toBeInTheDocument();

    show((el) => el === hero);
    expect(bar()).not.toBeInTheDocument();
    show(() => false);
    expect(bar()).toHaveAttribute('href', '/canchas');
    show((el) => el === footer);
    expect(bar()).not.toBeInTheDocument();
  });
});
