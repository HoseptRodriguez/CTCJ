import { MEMBERSHIP_STATUS } from '@ctcj/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it.each([
    ['al-dia', 'Al día', 'bg-status-ok-bg'],
    ['pendiente', 'Pendiente', 'bg-status-pending-bg'],
    ['vencida', 'Vencida', 'bg-status-overdue-bg'],
    ['suspendida', 'Suspendida', 'bg-status-suspended-bg'],
  ])('shows "%s" as the text "%s" with its own color', (status, text, bgClass) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(text);
    expect(badge).toHaveClass(bgClass);
    expect(badge).toHaveAttribute('data-status', status);
  });

  it('never relies on color alone: every state has visible text and an icon', () => {
    for (const status of ['al-dia', 'pendiente', 'vencida', 'suspendida']) {
      const { container, unmount } = render(<StatusBadge status={status} />);
      const badge = container.firstChild;
      expect(badge.textContent.trim().length).toBeGreaterThan(0);
      expect(badge.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      unmount();
    }
  });

  it.each([
    [MEMBERSHIP_STATUS.ACTIVE, 'Al día', 'al-dia'],
    [MEMBERSHIP_STATUS.PENDING, 'Pendiente', 'pendiente'],
    [MEMBERSHIP_STATUS.OVERDUE, 'Vencida', 'vencida'],
    [MEMBERSHIP_STATUS.SUSPENDED, 'Suspendida', 'suspendida'],
  ])('maps the backend code %s to "%s"', (code, text, key) => {
    render(<StatusBadge status={code} />);
    expect(screen.getByText(text)).toHaveAttribute('data-status', key);
  });

  it('shows INACTIVE as "Inactiva" with the suspended style', () => {
    render(<StatusBadge status={MEMBERSHIP_STATUS.INACTIVE} />);
    const badge = screen.getByText('Inactiva');
    expect(badge).toHaveAttribute('data-status', 'suspendida');
  });

  it('lets a custom label replace the text while keeping the state style', () => {
    render(<StatusBadge status="al-dia" label="Pagada" />);
    const badge = screen.getByText('Pagada');
    expect(badge).toHaveClass('bg-status-ok-bg');
    expect(screen.queryByText('Al día')).not.toBeInTheDocument();
  });

  it('shows a neutral "Sin estado" badge for an unknown status instead of crashing', () => {
    render(<StatusBadge status="ALGO_RARO" />);
    expect(screen.getByText('Sin estado')).toHaveAttribute('data-status', 'desconocido');
  });
});
