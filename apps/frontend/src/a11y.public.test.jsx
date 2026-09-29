import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { PRIVACY_POLICY } from '@ctcj/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../test/axe.js';

import { bookingClient } from './api/bookingClient.js';
import { infoRequestClient } from './api/infoRequestClient.js';
import { ToastProvider } from './components/ui/Toast.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { PublicLayout } from './layout/PublicLayout.jsx';
import { ClubPage } from './pages/ClubPage.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LegalPage } from './pages/legal/LegalPage.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ReservationPage } from './pages/ReservationPage.jsx';

vi.mock('./context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('./api/notificationsClient.js', () => ({
  notificationsClient: {
    getMyNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));
vi.mock('./api/infoRequestClient.js', () => ({
  infoRequestClient: { getFormToken: vi.fn(), submit: vi.fn() },
}));
vi.mock('./api/bookingClient.js', () => ({
  bookingClient: {
    getCourts: vi.fn(),
    getSchedule: vi.fn(),
    getPublicSchedule: vi.fn(),
    getAvailability: vi.fn(),
    getMyReservations: vi.fn(),
  },
}));

const COURTS = [1, 2, 3].map((n) => ({
  id: `c${n}`,
  name: `Cancha ${n}`,
  surface: 'CLAY',
  hasLighting: n < 3,
  priceCop: 35000,
}));

function renderAt(path, element) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path={path} element={element} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  infoRequestClient.getFormToken.mockResolvedValue({ formToken: 't' });
  useAuth.mockReturnValue({ status: 'anonymous', user: null, login: vi.fn(), logout: vi.fn() });
  for (const fn of Object.values(bookingClient)) {
    fn.mockResolvedValue({ courts: COURTS, reservations: [], date: '2026-09-28' });
  }
});

/**
 * WCAG 2.1 AA, automated part (axe-core): no serious or critical violation
 * on the main public pages, rendered inside the real layout (skip link,
 * header, footer). The build of the CI fails if one appears.
 */
describe('accessibility (axe) — public pages', () => {
  it('the page language is Spanish (Colombia)', () => {
    const html = readFileSync(`${cwd()}/index.html`, 'utf8');
    expect(html).toMatch(/<html lang="es-CO">/);
  });

  const pages = [
    ['/', <HomePage key="home" />, 'Arcilla, montaña y un buen partido.'],
    ['/el-club', <ClubPage key="club" />, 'El club'],
    ['/login', <Login key="login" />, null],
    ['/register', <Register key="register" />, null],
    ['/forgot-password', <ForgotPassword key="forgot" />, null],
    ['/canchas', <ReservationPage key="canchas" />, null],
    [PRIVACY_POLICY.path, <LegalPage key="legal" doc={PRIVACY_POLICY} />, PRIVACY_POLICY.title],
  ];

  for (const [path, element, h1] of pages) {
    it(`${path}: one h1, a skip link, and no serious violations`, async () => {
      renderAt(path, element);
      const headings = await screen.findAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      if (h1) expect(headings[0]).toHaveTextContent(h1);
      expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
        'href',
        '#contenido',
      );
      expect(document.getElementById('contenido')).not.toBeNull();
      expect(await a11yViolations()).toEqual([]);
    });
  }
});
