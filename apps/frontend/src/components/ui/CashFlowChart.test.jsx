import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CashFlowChart } from './CashFlowChart.jsx';

describe('CashFlowChart', () => {
  it('renders svg content for a month history', () => {
    const { container } = render(
      <CashFlowChart
        months={[
          { month: '2026-01', courtCop: 100000, membershipCop: 50000 },
          { month: '2026-02', courtCop: 120000, membershipCop: 60000 },
        ]}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders nothing for an empty history', () => {
    const { container } = render(<CashFlowChart months={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
