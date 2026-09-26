import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CLUB_TEXTS } from '../lib/clubTexts.js';

import { ClubPage } from './ClubPage.jsx';

function renderPage() {
  return render(
    <MemoryRouter>
      <ClubPage />
    </MemoryRouter>,
  );
}

describe('ClubPage (/el-club)', () => {
  it('has every brochure section, in order', () => {
    renderPage();
    const titles = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(titles).toEqual([
      'El club',
      'Por qué elegirnos',
      'Misión',
      'Visión',
      'Nuestros espacios',
      'Nuestra historia',
      '¿Dónde encontrarnos?',
      'Contactos',
    ]);
  });

  it('shows the official texts word for word, signed by Orlando Rodríguez', () => {
    renderPage();
    expect(screen.getByText(`“${CLUB_TEXTS.why}”`)).toBeInTheDocument();
    expect(screen.getByText('— Orlando Rodríguez')).toBeInTheDocument();
    for (const text of [
      CLUB_TEXTS.mission,
      CLUB_TEXTS.vision,
      CLUB_TEXTS.spaces,
      ...CLUB_TEXTS.history,
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(CLUB_TEXTS.history[0]).toContain('Academia de Tenis Ciudad Jardín');
  });

  it('"Cómo llegar" opens Google Maps searching for the club (a link, not an embedded map)', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /Cómo llegar/ });
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Club%20de%20Tenis%20Ciudad%20Jard%C3%ADn%2C%20Fusagasug%C3%A1',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('contacts: a big WhatsApp button and the three social networks', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /WhatsApp \+57 310 864 6361/ })).toHaveAttribute(
      'href',
      'https://wa.me/573108646361',
    );
    const socials = screen.getByRole('list', { name: 'Redes sociales' });
    expect(
      within(socials)
        .getAllByRole('link')
        .map((a) => a.textContent.replace(' (se abre en otra pestaña)', '')),
    ).toEqual(['Instagram', 'Facebook', 'TikTok']);
  });

  it('the full crest appears exactly once', () => {
    renderPage();
    expect(
      screen.getAllByRole('img', { name: 'Escudo del Club de Tenis Ciudad Jardín' }),
    ).toHaveLength(1);
  });
});
