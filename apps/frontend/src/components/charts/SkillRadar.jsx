import { SKILL_AREAS } from '../../lib/performance.js';
import { AREA_LABELS, describeRatingBand } from '../../lib/performanceRatingLabels.js';

// Wide canvas: long skill labels need room on both sides.
const WIDTH = 640;
const HEIGHT = 420;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RADIUS = 150;
const RINGS = [2, 4, 6, 8, 10];

function point(index, value) {
  const angle = (Math.PI * 2 * index) / SKILL_AREAS.length - Math.PI / 2;
  const r = (RADIUS * value) / 10;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function polygon(values) {
  return SKILL_AREAS.map((area, i) => point(i, values[area] ?? 0).join(',')).join(' ');
}

/**
 * Ten-skill radar: today's shape (navy, lime fill) over the shape three
 * months ago (dashed grey). Plain SVG -- no chart library on the player's
 * dashboard. No numbers are drawn (the player view uses words, not scores);
 * screen readers get a list of each skill with its level in words.
 *
 * @param {{ comparison: Record<string, {now: number|null, past: number|null}> }} props
 */
export function SkillRadar({ comparison }) {
  const now = Object.fromEntries(SKILL_AREAS.map((a) => [a, comparison[a]?.now]));
  const past = Object.fromEntries(SKILL_AREAS.map((a) => [a, comparison[a]?.past]));
  // The past shape is drawn only when EVERY rated skill has a value from
  // then -- otherwise the missing ones would plot as 0 and fake a collapse.
  // Partial comparisons still show per skill in the list below.
  const rated = SKILL_AREAS.filter((a) => now[a] != null);
  const hasPast = rated.length > 0 && rated.every((a) => past[a] != null);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto w-full max-w-xl"
        aria-hidden="true"
        focusable="false"
      >
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon(Object.fromEntries(SKILL_AREAS.map((a) => [a, ring])))}
            fill="none"
            stroke="#D5DBE4"
            strokeWidth="1"
          />
        ))}
        {SKILL_AREAS.map((area, i) => {
          const [x, y] = point(i, 10);
          return <line key={area} x1={CX} y1={CY} x2={x} y2={y} stroke="#D5DBE4" strokeWidth="1" />;
        })}
        {hasPast && (
          <polygon
            points={polygon(past)}
            fill="none"
            stroke="#4A5363"
            strokeWidth="2.5"
            strokeDasharray="6 5"
          />
        )}
        <polygon
          points={polygon(now)}
          fill="rgba(158,230,124,0.45)"
          stroke="#001A4D"
          strokeWidth="3"
        />
        {SKILL_AREAS.map((area, i) => {
          const [x, y] = point(i, 11.6);
          const anchor = Math.abs(x - CX) < 8 ? 'middle' : x > CX ? 'start' : 'end';
          return (
            <text
              key={area}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="20"
              fontWeight="600"
              fill="#0E1A33"
              // Phones scale the canvas down to unreadable sizes: there the
              // labels are dropped and the visible list below does the job.
              className="hidden md:block"
            >
              {AREA_LABELS[area]}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-4 text-body-sm text-ink">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-6 rounded bg-navy-500" /> Hoy
        </span>
        {hasPast && (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-6 border-t-[3px] border-dashed border-ink-soft"
            />{' '}
            Hace 3 meses
          </span>
        )}
      </figcaption>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Nivel por habilidad">
        {SKILL_AREAS.filter((a) => now[a] != null).map((area) => {
          const change = past[area] != null ? now[area] - past[area] : null;
          return (
            <li
              key={area}
              className="flex items-center justify-between gap-2 rounded-lg bg-page px-3 py-2"
            >
              <span className="text-body font-semibold text-ink">{AREA_LABELS[area]}</span>
              <span className="text-body-sm text-ink">
                {describeRatingBand(now[area])}
                {change > 0 && (
                  <span className="ml-1 font-semibold text-status-ok-fg">· mejoró</span>
                )}
                {change < 0 && (
                  <span className="ml-1 font-semibold text-status-overdue-fg">· bajó</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
