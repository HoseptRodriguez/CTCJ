import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../test/axe.js';
import { infoRequestClient } from '../api/infoRequestClient.js';
import { PHOTO_RIGHTS } from '../lib/photo-rights.js';
import { PROGRAMS } from '../lib/programs.js';
import { ProgramLinkCard } from '../components/brochure/ProgramLinkCard.jsx';

import { ProgramPage } from './ProgramPage.jsx';

vi.mock('../api/infoRequestClient.js', () => ({
  infoRequestClient: { getFormToken: vi.fn(), submit: vi.fn() },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/programas/:slug" element={<ProgramPage />} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  infoRequestClient.getFormToken.mockResolvedValue({ formToken: 't' });
});

describe('Program pages', () => {
  it('no program uses a photo with minors', () => {
    for (const p of PROGRAMS) expect(PHOTO_RIGHTS[p.photo].minors).toBe(false);
  });

  it.each(PROGRAMS)(
    '$slug: same structure, program preselected, links to the other two',
    async (p) => {
      const { container } = renderAt(`/programas/${p.slug}`);
      expect(screen.getByRole('heading', { level: 1, name: p.title })).toBeInTheDocument();
      for (const name of [
        '¿Para quién es?',
        '¿Qué incluye?',
        'Horarios y valor',
        'Entrenadores',
        'Preguntas frecuentes',
      ]) {
        expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
      }
      const form = screen.getByRole('region', { name: /Solicitar información:/ });
      expect(within(form).getByRole('radio', { checked: true })).toHaveAttribute(
        'value',
        p.infoProgram,
      );

      const others = screen.getByRole('region', { name: 'Otros programas' });
      const hrefs = within(others)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'));
      expect(hrefs.sort()).toEqual(
        PROGRAMS.filter((o) => o.slug !== p.slug)
          .map((o) => `/programas/${o.slug}`)
          .sort(),
      );
      expect(await a11yViolations(container)).toEqual([]);
    },
  );

  it('competition also links to the ranking and tournaments', () => {
    renderAt('/programas/competencia');
    expect(screen.getByRole('link', { name: 'Ver los torneos' })).toHaveAttribute(
      'href',
      '/torneos',
    );
    expect(screen.getByRole('link', { name: 'Ver el ranking' })).toHaveAttribute(
      'href',
      '/mi-ctcj/ranking',
    );
  });

  it('the FAQ is an accordion operable with the keyboard', async () => {
    const user = userEvent.setup();
    renderAt('/programas/adultos');
    const faq = screen.getByRole('region', { name: 'Preguntas frecuentes' });
    const [first] = within(faq).getAllByRole('button');
    expect(first).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(first.getAttribute('aria-controls'));
    expect(panel).not.toBeVisible();
    first.focus();
    await user.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    await user.keyboard(' ');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('an unknown program goes back to the home page', () => {
    renderAt('/programas/no-existe');
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });
});

describe('ProgramLinkCard (home page cards)', () => {
  it('the whole card is one link named by the program and "Ver programa"', () => {
    render(
      <MemoryRouter>
        <ProgramLinkCard program={PROGRAMS[1]} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Escuela infantil Ver programa' });
    expect(link).toHaveAttribute('href', '/programas/escuela-infantil');
  });
});
