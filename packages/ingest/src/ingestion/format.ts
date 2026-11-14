export const formatNumber = (n: number) => n.toLocaleString('en-US');

export const pyStr = (value: unknown): string => (value == null ? 'None' : String(value));

export const pyRepr = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : pyStr(value);

export const pyDict = (fields: Record<string, unknown>): string =>
  `{${Object.entries(fields)
    .map(([key, value]) => `'${key}': ${pyRepr(value)}`)
    .join(', ')}}`;

export const naiveSeconds = (dateTime: string) =>
  Date.parse(`${dateTime.replace(' ', 'T')}Z`) / 1000;

export const utcNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
