import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PerformanceLineChart } from './PerformanceLineChart.jsx';
import { PerformanceRadarChart } from './PerformanceRadarChart.jsx';

describe('Performance charts', () => {
  it('PerformanceRadarChart renders svg content for rated areas', () => {
    const { container } = render(
      <PerformanceRadarChart latestByArea={{ FOREHAND: 7, SERVE: 6 }} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('PerformanceRadarChart renders nothing when there are no ratings', () => {
    const { container } = render(<PerformanceRadarChart latestByArea={{}} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('PerformanceLineChart renders svg content for a rating history', () => {
    const { container } = render(
      <PerformanceLineChart
        ratings={[
          { area: 'FOREHAND', rating: 6, recordedAt: '2026-01-01T00:00:00.000Z' },
          { area: 'FOREHAND', rating: 8, recordedAt: '2026-02-01T00:00:00.000Z' },
        ]}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('PerformanceLineChart renders nothing for empty history', () => {
    const { container } = render(<PerformanceLineChart ratings={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
