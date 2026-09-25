import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FONT_SCALE_STORAGE_KEY, initFontScale } from '../../lib/fontScale.js';

import { FontSizeToggle } from './FontSizeToggle.jsx';

const html = document.documentElement;

describe('FontSizeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete html.dataset.fontScale;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a visible "Letra grande" label, not pressed by default', () => {
    render(<FontSizeToggle />);
    const button = screen.getByRole('button', { name: 'Letra grande' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('A+');
    expect(html.dataset.fontScale).toBeUndefined();
  });

  it('enlarges the text (html data-font-scale) and saves the choice when pressed', async () => {
    const user = userEvent.setup();
    render(<FontSizeToggle />);

    await user.click(screen.getByRole('button', { name: 'Letra grande' }));

    expect(screen.getByRole('button', { name: 'Letra grande' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(html.dataset.fontScale).toBe('large');
    expect(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)).toBe('large');
  });

  it('goes back to normal size and forgets the choice when pressed again', async () => {
    const user = userEvent.setup();
    render(<FontSizeToggle />);
    const button = screen.getByRole('button', { name: 'Letra grande' });

    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(html.dataset.fontScale).toBeUndefined();
    expect(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)).toBeNull();
  });

  it('starts pressed when the choice was saved on a previous visit', () => {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, 'large');
    initFontScale();

    render(<FontSizeToggle />);

    expect(html.dataset.fontScale).toBe('large');
    expect(screen.getByRole('button', { name: 'Letra grande' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps two toggles on the same page in sync', async () => {
    const user = userEvent.setup();
    render(
      <>
        <FontSizeToggle />
        <FontSizeToggle tone="dark" />
      </>,
    );
    const [first, second] = screen.getAllByRole('button', { name: 'Letra grande' });

    await user.click(first);

    expect(second).toHaveAttribute('aria-pressed', 'true');
  });

  it('still works for the session when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const user = userEvent.setup();
    render(<FontSizeToggle />);

    await user.click(screen.getByRole('button', { name: 'Letra grande' }));

    expect(html.dataset.fontScale).toBe('large');
    expect(screen.getByRole('button', { name: 'Letra grande' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
