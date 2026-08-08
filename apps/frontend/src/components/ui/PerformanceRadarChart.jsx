import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { describeArea } from '../../lib/performanceRatingLabels.js';

const ALL_AREAS = [
  'FOREHAND',
  'BACKHAND',
  'SERVE',
  'RETURN',
  'VOLLEY',
  'OVERHEAD',
  'SLICE',
  'FOOTWORK',
  'FITNESS',
  'MENTALITY',
];

/**
 * Current strengths/weaknesses profile across the 6 skill axes. Areas with
 * no rating yet are omitted entirely, never plotted at 0 -- a 0 would
 * visually claim "rated 0/10," which is false. A radar with only 1-2 axes
 * (early on, before a full evaluation) looks sparse but is the honest
 * representation, not a bug.
 *
 * @param {{ latestByArea: Record<string, number> }} props
 */
export function PerformanceRadarChart({ latestByArea }) {
  const ratedAreas = ALL_AREAS.filter((area) => latestByArea[area] != null);
  if (ratedAreas.length === 0) return null;

  const data = ratedAreas.map((area) => ({ area: describeArea(area), rating: latestByArea[area] }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="#CFD1D4" />
        <PolarAngleAxis dataKey="area" tick={{ fill: '#5A606A', fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={{ fill: '#6B7079', fontSize: 10 }} />
        <Radar
          name="Nivel actual"
          dataKey="rating"
          stroke="#001A4D"
          fill="#9EE67C"
          fillOpacity={0.5}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#5A606A' }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
