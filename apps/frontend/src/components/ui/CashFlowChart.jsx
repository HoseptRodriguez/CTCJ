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

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' });
const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Cash flow: revenue by club-local month, stacked by source (court
 * payments vs. membership payments) so both the trend and the composition
 * are visible at once -- a "professional" chart per the club's own
 * requirement, not a bare number table.
 *
 * @param {{ months: Array<{ month: string, courtCop: number, membershipCop: number }> }} props
 */
export function CashFlowChart({ months }) {
  if (!months || months.length === 0) return null;

  const data = months.map((m) => ({
    ...m,
    label: formatMonthLabel(m.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid stroke="#E5E6E7" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fill: '#6B7079', fontSize: 11 }} />
        <YAxis
          tick={{ fill: '#6B7079', fontSize: 11 }}
          tickFormatter={(value) => COP_FORMATTER.format(value)}
          width={90}
        />
        <Tooltip
          formatter={(value) => COP_FORMATTER.format(value)}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#5A606A' }} />
        <Bar dataKey="courtCop" name="Canchas" stackId="revenue" fill="#5D74A4" />
        <Bar dataKey="membershipCop" name="Membresías" stackId="revenue" fill="#9EE67C" />
      </BarChart>
    </ResponsiveContainer>
  );
}
