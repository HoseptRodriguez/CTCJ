import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkillRadar } from './SkillRadar.jsx';

const empty = { now: null, past: null };

describe('SkillRadar', () => {
  it('draws the "3 months ago" shape only when every rated skill has a value from then', () => {
    const { rerender } = render(
      <SkillRadar
        comparison={{
          SERVE: { now: 8, past: 5 },
          FOREHAND: { now: 7, past: null },
          BACKHAND: empty,
        }}
      />,
    );
    expect(screen.queryByText('Hace 3 meses')).not.toBeInTheDocument();

    rerender(
      <SkillRadar comparison={{ SERVE: { now: 8, past: 5 }, FOREHAND: { now: 7, past: 6 } }} />,
    );
    expect(screen.getByText('Hace 3 meses')).toBeInTheDocument();
  });

  it('lists each rated skill in words, marking what improved or dropped', () => {
    render(
      <SkillRadar comparison={{ SERVE: { now: 8, past: 5 }, FOOTWORK: { now: 3, past: 4 } }} />,
    );
    const list = screen.getByRole('list', { name: 'Nivel por habilidad' });
    expect(list).toHaveTextContent('SaqueMuy bueno· mejoró');
    expect(list).toHaveTextContent('Juego de piesEn desarrollo· bajó');
  });
});
