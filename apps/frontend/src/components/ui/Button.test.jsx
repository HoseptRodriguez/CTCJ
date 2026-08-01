import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button.jsx';

describe('Button', () => {
  it('renders a native button by default', () => {
    render(<Button>Reservar</Button>);
    const el = screen.getByRole('button', { name: 'Reservar' });
    expect(el.tagName).toBe('BUTTON');
  });

  it('applies the primary variant classes (never white text on the green fill)', () => {
    render(<Button>Reservar</Button>);
    const el = screen.getByRole('button', { name: 'Reservar' });
    expect(el.className).toContain('bg-action');
    expect(el.className).toContain('text-on-action');
    expect(el.className).not.toContain('text-white');
  });

  it.each(['secondary', 'outline', 'ghost', 'danger'])('renders the %s variant', (variant) => {
    render(<Button variant={variant}>Acción</Button>);
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });

  it('renders a router Link when given `to`', () => {
    render(
      <MemoryRouter>
        <Button to="/canchas">Ver canchas</Button>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Ver canchas' });
    expect(link).toHaveAttribute('href', '/canchas');
  });

  it('renders a plain anchor when given `href`', () => {
    render(<Button href="https://wa.me/000">WhatsApp</Button>);
    const link = screen.getByRole('link', { name: 'WhatsApp' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://wa.me/000');
  });

  it('forwards click handlers and extra props', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    screen.getByRole('button', { name: 'Click' }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
