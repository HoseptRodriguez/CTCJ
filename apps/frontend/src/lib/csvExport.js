/**
 * Client-side CSV export for the finance dashboard's "Reports" need (Phase 9)
 * -- serializes data already fetched for on-screen display, no backend
 * export pipeline. `rows` are plain objects; `columns` maps a CSV header to
 * a getter so callers control exactly what's exported and in what order.
 *
 * @param {{ filename: string, columns: Array<{ header: string, get: (row: object) => string|number }>, rows: object[] }} input
 */
export function exportToCsv({ filename, columns, rows }) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [
    columns.map((c) => escapeCell(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => escapeCell(c.get(row))).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
