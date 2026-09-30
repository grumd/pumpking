// Formatting that keeps the messages the same as the legacy Python ones

// Python's `f"{n:,}"`
export const formatNumber = (n: number) => n.toLocaleString('en-US');

// Python's `str()` for the values that end up in messages
export const pyStr = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'None';
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  return String(value);
};

// Close to Python's `repr()`, for the report lines that print changed fields
export const pyRepr = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : pyStr(value);

// `{'field': value, ...}`, like a printed Python dict
export const pyDict = (fields: Record<string, unknown>): string =>
  `{${Object.entries(fields)
    .map(([key, value]) => `'${key}': ${pyRepr(value)}`)
    .join(', ')}}`;

// Naive datetimes ('YYYY-MM-DD HH:MM:SS', no zone) as seconds, for differences only
export const naiveSeconds = (dateTime: string) =>
  Date.parse(`${dateTime.replace(' ', 'T')}Z`) / 1000;

// The current UTC time as a naive datetime, which is how `results.added` is stored
export const utcNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
