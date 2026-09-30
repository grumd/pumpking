/**
 * Admin mutations return a `report`: lines saying what they changed, which the web shows
 * in the admin activity log (like the desktop tool's log panel).
 */

const formatValue = (value: unknown) => {
  if (value == null || value === '') {
    return '—';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return typeof value === 'string' ? `'${value}'` : String(value);
};

// One line per column whose value differs, e.g. "Result #5: score 900000 → 950000"
export const describeChanges = (
  label: string,
  before: Record<string, unknown>,
  changes: Record<string, unknown>
): string[] =>
  Object.entries(changes)
    .filter(([column, value]) => formatValue(before[column]) !== formatValue(value))
    .map(
      ([column, value]) =>
        `${label}: ${column} ${formatValue(before[column])} → ${formatValue(value)}`
    );
