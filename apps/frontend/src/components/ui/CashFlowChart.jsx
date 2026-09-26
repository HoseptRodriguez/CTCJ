import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { capitalize, formatCop } from '../../lib/format.js';

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const MONTH_LONG = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const COMPACT = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });

// Brand colors with enough contrast against white and each other.
const COURT_COLOR = '#B8532A'; // clay
const MEMBERSHIP_COLOR = '#001A4D'; // navy
const TEXT = { fill: '#4A5363', fontSize: 16 };

function monthDate(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Cash flow: revenue by club-local month, stacked by source (courts vs.
 * memberships), so both the trend and the composition are visible. The
 * same figures are listed in a table under the chart, so nothing depends
 * on reading the bars.
 *
 * @param {{ months: Array<{ month: string, courtCop: number, membershipCop: number }> }} props
 */
export function CashFlowChart({ months }) {
  if (!months || months.length === 0) return null;

  const data = months.map((m) => ({
    ...m,
    label: MONTH_FORMATTER.format(monthDate(m.month)).replace('.', ''),
  }));

  return (
    <div>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#D5DBE4" vertical={false} />
            <XAxis dataKey="label" tick={TEXT} tickLine={false} axisLine={{ stroke: '#8A93A3' }} />
            <YAxis
              tick={TEXT}
              tickFormatter={(v) => `$${COMPACT.format(v)}`}
              width={72}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => formatCop(value)}
              contentStyle={{ fontSize: 16 }}
              cursor={{ fill: '#E8ECF3' }}
            />
            <Legend wrapperStyle={{ fontSize: 16, color: '#0E1A33' }} />
            <Bar
              dataKey="courtCop"
              name="Canchas"
              stackId="revenue"
              fill={COURT_COLOR}
              isAnimationActive={false}
            />
            <Bar
              dataKey="membershipCop"
              name="Membresías"
              stackId="revenue"
              fill={MEMBERSHIP_COLOR}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-body">
          <caption className="sr-only">Ingresos por mes</caption>
          <thead>
            <tr className="border-b-2 border-line text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Mes
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-3 w-3 rounded-sm"
                  style={{ background: COURT_COLOR }}
                />
                Canchas
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-3 w-3 rounded-sm"
                  style={{ background: MEMBERSHIP_COLOR }}
                />
                Membresías
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2 pr-3 font-semibold text-ink">
                  {capitalize(MONTH_LONG.format(monthDate(m.month)))}
                </th>
                <td className="py-2 pr-3 text-right text-ink">{formatCop(m.courtCop)}</td>
                <td className="py-2 pr-3 text-right text-ink">{formatCop(m.membershipCop)}</td>
                <td className="py-2 text-right font-bold text-ink">
                  {formatCop(m.courtCop + m.membershipCop)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
