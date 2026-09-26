import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, initialsOf } from './Avatar.jsx';

describe('Avatar', () => {
  it('initials: first letter of first and last name', () => {
    expect(initialsOf('Hosept', 'Rodríguez')).toBe('HR');
    expect(initialsOf('ana', '')).toBe('A');
    expect(initialsOf()).toBe('?');
  });

  it('shows the photo when it loads', () => {
    render(<Avatar src="/foto.jpg" firstName="Ana" lastName="Gómez" alt="Tu foto de perfil" />);
    expect(screen.getByRole('img', { name: 'Tu foto de perfil' }).tagName).toBe('IMG');
  });

  it('a broken image becomes the initials on lime, never the broken-image icon', () => {
    const { container } = render(
      <Avatar
        src="/uploads/avatars/roto.jpg"
        firstName="Hosept"
        lastName="Rodríguez"
        fallbackAlt="Aún sin foto"
      />,
    );
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    const initials = screen.getByRole('img', { name: 'Aún sin foto' });
    expect(initials).toHaveTextContent('HR');
    expect(initials.className).toContain('bg-lime');
  });

  it('without a photo, the initials are decorative unless a name is given', () => {
    const { container } = render(<Avatar firstName="Luis" lastName="Paz" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toHaveTextContent('LP');
  });
});
