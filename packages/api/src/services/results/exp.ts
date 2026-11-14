export const getResultExp = (
  result: {
    score: number;
  },
  chart: {
    level: number;
    label: string;
  }
): number => {
  const value = Math.max(0.1, ((result.score - 400000) * 2) / 1000000);
  if (chart.label.startsWith('COOP')) {
    return chart.level * 50 * value;
  }
  const exp = (chart.level ** 2.31 * value) / 9;
  return exp;
};
