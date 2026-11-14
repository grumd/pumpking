const DAY_MS = 86_400_000;
const MAX_COUNTED_CHARTS = 200;

export const utcDay = (date: Date) => Math.floor(date.getTime() / DAY_MS);

export const utcDayStart = (day: number) => new Date(day * DAY_MS);

export const ppAgeFactor = (ageDays: number) => {
  const years = ageDays / 365;
  if (years <= 1) {
    return 1;
  }
  if (years <= 2) {
    return 1 - 0.25 * (years - 1);
  }
  if (years <= 5) {
    return 0.75 - (0.5 * (years - 2)) / 3;
  }
  return 0.25;
};

export type PpResult = { sharedChartId: number; pp: number; gained: Date };

export const getCountedResults = <T extends PpResult>(results: T[], day: number) => {
  const counted = new Map<number, { result: T; pp: number }>();
  for (const result of results) {
    const pp = result.pp * ppAgeFactor(day - utcDay(result.gained));
    if (pp > (counted.get(result.sharedChartId)?.pp ?? 0)) {
      counted.set(result.sharedChartId, { result, pp });
    }
  }
  return counted;
};

export const getChartPp = (results: PpResult[], day: number) => {
  const chartPp = new Map<number, number>();
  for (const [sharedChartId, { pp }] of getCountedResults(results, day)) {
    chartPp.set(sharedChartId, pp);
  }
  return chartPp;
};

const placeWeight = (index: number) => (index < MAX_COUNTED_CHARTS ? 0.95 ** index : 0);

export const getTotalFromChartPp = (chartPp: Map<number, number>) =>
  [...chartPp.values()]
    .sort((a, b) => b - a)
    .reduce((total, pp, index) => total + placeWeight(index) * pp, 0);

export const getTotalPp = (results: PpResult[], day: number) =>
  getTotalFromChartPp(getChartPp(results, day));

export const getCountedCharts = <T extends PpResult>(results: T[], day: number) =>
  [...getCountedResults(results, day).values()]
    .sort((a, b) => b.pp - a.pp)
    .slice(0, MAX_COUNTED_CHARTS)
    .map((chart, index) => ({ ...chart, weight: placeWeight(index) }));

export const roundPp = (pp: number) => Math.round(pp * 100) / 100;
