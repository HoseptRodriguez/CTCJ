import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { COOKIES_POLICY, PRIVACY_POLICY } from '@ctcj/shared';

import { Footer } from '../../layout/Footer.jsx';
import { OPEN_COOKIE_SETTINGS_EVENT } from '../../lib/cookieSettingsEvent.js';

import { LEGAL_PAGES, LegalPage } from './LegalPage.jsx';

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('legal pages', () => {
  it('show the title, the version and the last update, with a table of contents', () => {
    renderIn(<LegalPage doc={PRIVACY_POLICY} />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de Tratamiento de Datos Personales',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Versión 3 · Última actualización: 29 de septiembre de 2026/),
    ).toBeInTheDocument();
    const toc = screen.getByRole('navigation', { name: 'Contenido' });
    expect(within(toc).getAllByRole('link')).toHaveLength(PRIVACY_POLICY.sections.length);
    // Deadlines of Ley 1581 and the data the club still has to give.
    expect(screen.getByText(/máximo 10 días hábiles/)).toBeInTheDocument();
    expect(screen.getByText(/máximo 15 días hábiles/)).toBeInTheDocument();
    expect(screen.getAllByText(/\[COMPLETAR: razón social\]/).length).toBeGreaterThan(0);
  });

  it('there is exactly one h1 per page', () => {
    for (const { doc } of LEGAL_PAGES) {
      const { unmount } = renderIn(<LegalPage doc={doc} />);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      unmount();
    }
  });

  it('the cookies page lists every stored item and offers "Configurar cookies"', async () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, listener);
    renderIn(<LegalPage doc={COOKIES_POLICY} />);
    for (const name of ['ctcj_refresh', 'ctcj:cookie-consent', 'ctcj:font-scale']) {
      expect(screen.getByRole('cell', { name })).toBeInTheDocument();
    }
    await userEvent.setup().click(screen.getByRole('button', { name: 'Configurar cookies' }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, listener);
  });
});

describe('footer', () => {
  it('links every legal page, offers "Configurar cookies" and shows the business details', () => {
    renderIn(<Footer />);
    const legal = screen.getByRole('navigation', { name: 'Documentos legales' });
    for (const path of ['/privacidad', '/terminos', '/cookies', '/reembolsos', '/accesibilidad']) {
      expect(
        within(legal)
          .getAllByRole('link')
          .map((a) => a.getAttribute('href')),
      ).toContain(path);
    }
    expect(within(legal).getByRole('button', { name: 'Configurar cookies' })).toBeInTheDocument();
    expect(screen.getByText(/NIT \[COMPLETAR: NIT\]/)).toBeInTheDocument();
    expect(screen.getByText(/Kilómetro 1 vía Fusagasugá – Tibacuy/)).toBeInTheDocument();
  });
});
