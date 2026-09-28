import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { slotStartIso } from '../../lib/clubTime.js';

import { CourtGrid } from './CourtGrid.jsx';

// The desktop table (the phone layout is one list per court).
vi.mock('../../lib/useMediaQuery.js', () => ({ useMediaQuery: () => true }));

const DAY = '2026-10-05';
const COURTS = [1, 2, 3].map((n) => ({ id: `c${n}`, name: `Cancha ${n}`, hasLighting: true }));
// Cancha 2 at 8:00 is taken: arrows skip it.
const RESERVATIONS = [
  {
    courtId: 'c2',
    periodStart: slotStartIso(DAY, 8),
    periodEnd: slotStartIso(DAY, 9),
    label: null,
  },
];

function renderGrid() {
  render(
    <CourtGrid
      schedule={{ courts: COURTS, reservations: RESERVATIONS }}
      dateKey={DAY}
      hours={[7, 8, 9]}
      selected={null}
      onSelect={() => {}}
      now={new Date('2026-10-01T12:00:00-05:00')}
    />,
  );
}

const cell = (court, hour) =>
  screen.getByRole('button', { name: new RegExp(`^Cancha ${court}, ${hour}:00`) });

describe('CourtGrid — keyboard', () => {
  it('arrow keys move between free hours and courts, skipping the taken ones', async () => {
    const user = userEvent.setup();
    renderGrid();
    expect(screen.getByText(/las flechas te llevan a la siguiente hora libre/)).toBeInTheDocument();

    cell(1, 8).focus();
    await user.keyboard('{ArrowRight}');
    // Cancha 2 at 8:00 is taken: straight to Cancha 3.
    expect(cell(3, 8)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(cell(3, 7)).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(cell(2, 7)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    // Cancha 2 at 8:00 is taken: down to 9:00.
    expect(cell(2, 9)).toHaveFocus();
    // At the edge, nothing moves.
    await user.keyboard('{ArrowDown}');
    expect(cell(2, 9)).toHaveFocus();
  });
});
