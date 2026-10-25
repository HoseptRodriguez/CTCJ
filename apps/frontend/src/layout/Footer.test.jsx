import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { a11yViolations } from '../../test/axe.js';
import { PUBLISHED_SOCIAL_LINKS, SOCIAL_LINKS, isPublishableUrl } from '../lib/clubInfo.js';

import { Footer } from './Footer.jsx';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('only shows social networks whose link is a valid https URL', () => {
    expect(isPublishableUrl('https://www.instagram.com/club')).toBe(true);
    for (const bad of [
      '[COMPLETAR: URL]',
      'http://instagram.com/club',
      'instagram.com',
      '',
      'https://x',
    ]) {
      expect(isPublishableUrl(bad)).toBe(false);
    }
    for (const { url } of PUBLISHED_SOCIAL_LINKS) expect(isPublishableUrl(url)).toBe(true);
    expect(PUBLISHED_SOCIAL_LINKS.length).toBeLessThanOrEqual(SOCIAL_LINKS.length);

    renderFooter();
    const shown = screen.queryByRole('list', { name: 'Redes sociales' });
    const links = shown ? within(shown).getAllByRole('link') : [];
    expect(links).toHaveLength(PUBLISHED_SOCIAL_LINKS.length);
    for (const a of links) {
      expect(isPublishableUrl(a.getAttribute('href'))).toBe(true);
      expect(a).toHaveAccessibleName(/.+/);
    }
  });

  it('four columns: brand, Navegar, Contacto and Legal; one WhatsApp link', () => {
    renderFooter();
    for (const name of ['Navegar', 'Contacto', 'Legal']) {
      // jsdom has no CSS: the phone button and the desktop title both count here.
      expect(
        screen.getByRole('heading', { level: 2, name: new RegExp(`^${name}`) }),
      ).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: /WhatsApp/ })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAccessibleName(
      /se abre en otra aplicación o sitio/,
    );
    expect(screen.getByText(/Horario de atención/)).toBeInTheDocument();
    expect(screen.getByText('Hecho en Fusagasugá')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeInTheDocument();
  });

  it('on phones each column opens and closes with its title button', async () => {
    const user = userEvent.setup();
    renderFooter();
    const toggle = screen.getByRole('button', { name: /^Contacto/ });
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveClass('hidden');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveClass('hidden');
  });

  it('has no serious accessibility violations', async () => {
    const { container } = renderFooter();
    expect(await a11yViolations(container)).toEqual([]);
  });
});
