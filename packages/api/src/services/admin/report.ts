const formatValue = (value: unknown) => {
  if (value == null || value === '') {
    return '—';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return typeof value === 'string' ? `'${value}'` : String(value);
};

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
