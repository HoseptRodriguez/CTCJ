import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDocumentTitle } from './useDocumentTitle.js';

function Page({ title }) {
  useDocumentTitle(title);
  return null;
}

describe('useDocumentTitle', () => {
  it('sets the document title with the club suffix', () => {
    render(<Page title="Mi CTCJ" />);
    expect(document.title).toBe('Mi CTCJ · Club de Tenis Ciudad Jardín');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'Título original';
    const { unmount } = render(<Page title="Reserva tu cancha" />);
    expect(document.title).toBe('Reserva tu cancha · Club de Tenis Ciudad Jardín');
    unmount();
    expect(document.title).toBe('Título original');
  });
});
