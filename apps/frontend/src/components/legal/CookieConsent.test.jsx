import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIES_POLICY } from '@ctcj/shared';

import { consentClient } from '../../api/consentClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  COOKIE_CONSENT_KEY,
  hasCookieConsent,
  readCookieConsent,
} from '../../lib/cookieConsent.js';
import { openCookieSettings } from '../../lib/cookieSettingsEvent.js';

import { CookieConsent } from './CookieConsent.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/consentClient.js', () => ({
  consentClient: { recordCookieConsent: vi.fn() },
}));

const renderBanner = () =>
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
const banner = () => screen.queryByRole('region', { name: 'Cookies en este sitio' });

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useAuth.mockReturnValue({ status: 'anonymous', user: null });
  consentClient.recordCookieConsent.mockResolvedValue({ action: 'ACCEPTED' });
});

describe('cookie banner', () => {
  it('first visit: three choices with the same size and visual weight; nothing optional is allowed yet', () => {
    renderBanner();
    const region = banner();
    expect(region).toBeInTheDocument();
    const buttons = within(region).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Aceptar todas',
      'Solo necesarias',
      'Configurar',
    ]);
    expect(new Set(buttons.map((b) => b.className)).size).toBe(1);
    expect(within(region).getByRole('link', { name: 'Política de cookies' })).toHaveAttribute(
      'href',
      '/cookies',
    );
    expect(hasCookieConsent('PREFERENCES')).toBe(false);
  });

  it('"Aceptar todas" and "Solo necesarias" save the decision with date and policy version', async () => {
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole('button', { name: 'Solo necesarias' }));
    expect(banner()).not.toBeInTheDocument();
    expect(readCookieConsent()).toMatchObject({
      version: COOKIES_POLICY.version,
      preferences: false,
      analytics: false,
      decidedAt: expect.any(String),
    });

    act(() => openCookieSettings());
    const panel = await screen.findByRole('dialog', { name: 'Configurar cookies' });
    await user.click(within(panel).getByLabelText(/Preferencias/));
    await user.click(within(panel).getByRole('button', { name: 'Guardar mi elección' }));
    expect(hasCookieConsent('PREFERENCES')).toBe(true);
    expect(hasCookieConsent('ANALYTICS')).toBe(false);
  });

  it('necessary cookies are shown as always on, and analytics cannot be turned on today', async () => {
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole('button', { name: 'Configurar' }));
    const panel = await screen.findByRole('dialog', { name: 'Configurar cookies' });
    expect(within(panel).getByLabelText(/Necesarias/)).toBeChecked();
    expect(within(panel).getByLabelText(/Necesarias/)).toBeDisabled();
    expect(within(panel).getByLabelText(/Analítica/)).not.toBeChecked();
    expect(within(panel).getByLabelText(/Analítica/)).toBeDisabled();
    expect(within(panel).getByLabelText(/Preferencias/)).not.toBeChecked();
  });

  it('a decision about an older policy version asks again', () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        version: '0',
        decidedAt: '2026-01-01T00:00:00Z',
        preferences: true,
        analytics: false,
      }),
    );
    renderBanner();
    expect(banner()).toBeInTheDocument();
    expect(hasCookieConsent('PREFERENCES')).toBe(false);
  });

  it('signed-in people: the decision is recorded once as proof', async () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles: [] } });
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole('button', { name: 'Aceptar todas' }));

    await waitFor(() =>
      expect(consentClient.recordCookieConsent).toHaveBeenCalledWith({
        preferences: true,
        analytics: false,
        policyVersion: COOKIES_POLICY.version,
      }),
    );
    await waitFor(() => expect(readCookieConsent().recordedFor).toBe('u1'));
    expect(consentClient.recordCookieConsent).toHaveBeenCalledTimes(1);
  });

  it('visitors without a session are never sent to the server', async () => {
    const user = userEvent.setup();
    renderBanner();
    await user.click(screen.getByRole('button', { name: 'Aceptar todas' }));
    expect(consentClient.recordCookieConsent).not.toHaveBeenCalled();
  });
});
