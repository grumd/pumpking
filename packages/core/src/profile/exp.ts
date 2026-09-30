export const getResultExp = (
  result: {
    score: number;
  },
  chart: {
    level: number;
    label: string;
  }
): number => {
  // score range is 0 -> 1000000, but below 400000 is basically D/F
  // 400000 or below -> 0.1
  // 1000000 -> 1.2
  // value range is 0.1 -> 1.2
  const value = Math.max(0.1, ((result.score - 400000) * 2) / 1000000);
  if (chart.label.startsWith('COOP')) {
    return chart.level * 50 * value;
  }
  const exp = (chart.level ** 2.31 * value) / 9;
  return exp;
};
