import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { describeArea } from '../../lib/performanceRatingLabels.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

// Fixed, distinct color per area, drawn from the existing brand palette
// (tailwind.config.js) -- never a literal hex invented outside that token set.
const AREA_COLORS = {
  FOREHAND: '#001A4D', // navy-500
  BACKHAND: '#4C942E', // green-600 (success)
  SERVE: '#5D74A4', // navy-300
  RETURN: '#7FD455', // green-400
  VOLLEY: '#93A3C3', // navy-200
  OVERHEAD: '#5A606A', // text-secondary
  SLICE: '#2E4881', // navy-400
  FOOTWORK: '#63B93B', // green-500
  FITNESS: '#C9D2E2', // navy-100
  MENTALITY: '#3A7024', // green-700
};

/** Groups ratings by exact recordedAt instant -- each snapshot batch shares
 * one timestamp, so this reconstructs one chart row per snapshot, with only
 * the areas actually rated in that snapshot populated (others left absent,
 * not zeroed -- Recharts skips a Line's gap rather than drawing to 0). */
function pivotByTimestamp(ratings) {
  const byTime = new Map();
  for (const rating of ratings) {
    const key = new Date(rating.recordedAt).getTime();
    if (!byTime.has(key)) byTime.set(key, { recordedAt: rating.recordedAt });
    byTime.get(key)[rating.area] = rating.rating;
  }
  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt),
  );
}

/**
 * Technical evolution: one line per area, rating over time. Only draws a
 * line for an area that has at least one rating anywhere in the history.
 * @param {{ ratings: Array<{ area: string, rating: number, recordedAt: string|Date }> }} props
 */
export function PerformanceLineChart({ ratings }) {
  if (!ratings || ratings.length === 0) return null;

  const data = pivotByTimestamp(ratings);
  const areasPresent = [...new Set(ratings.map((r) => r.area))];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid stroke="#E5E6E7" strokeDasharray="3 3" />
        <XAxis
          dataKey="recordedAt"
          tickFormatter={(value) => DATE_FORMATTER.format(new Date(value))}
          tick={{ fill: '#6B7079', fontSize: 11 }}
        />
        <YAxis domain={[1, 10]} tick={{ fill: '#6B7079', fontSize: 11 }} />
        <Tooltip
          labelFormatter={(value) => DATE_FORMATTER.format(new Date(value))}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#5A606A' }} formatter={describeArea} />
        {areasPresent.map((area) => (
          <Line
            key={area}
            type="monotone"
            dataKey={area}
            name={area}
            stroke={AREA_COLORS[area] ?? '#5A606A'}
            connectNulls={false}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
