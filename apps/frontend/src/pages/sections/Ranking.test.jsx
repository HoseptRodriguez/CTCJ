import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Ranking } from './Ranking.jsx';

// Regression test for the standing "never invent player information" rule --
// v7's own prototype rendered fake "Jugador Ejemplo A/B/C/D" rows even though
// labeled as demo data. This section must show zero rows, always, no matter
// which tab/category/season is selected.
describe('Ranking section', () => {
  it('renders no table, no table rows, and no player names', () => {
    render(<Ranking />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.queryByText(/Jugador Ejemplo/i)).not.toBeInTheDocument();
  });

  it('shows the genuine "no active season" message', () => {
    render(<Ranking />);
    expect(screen.getByText('Todavía no hay una temporada activa')).toBeInTheDocument();
  });

  it('still renders no rows after switching modality and category', async () => {
    const user = userEvent.setup();
    render(<Ranking />);

    await user.click(screen.getByRole('tab', { name: 'Dobles' }));
    await user.click(screen.getByRole('button', { name: 'Categoría 3' }));

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.queryByText(/Jugador Ejemplo/i)).not.toBeInTheDocument();
    expect(screen.getByText('Todavía no hay una temporada activa')).toBeInTheDocument();
  });

  it('season selector has no real seasons to choose from', () => {
    render(<Ranking />);
    const select = screen.getByLabelText('Temporada');
    expect(select).toBeDisabled();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
});
