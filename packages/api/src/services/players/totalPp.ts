/**
 * A player's total pp: on each chart the result with the most pp after the age factor
 * counts, then the top 200 charts are weighted by 0.95 ** place. A result's own pp
 * (results.pp) stays its full value, the age factor only applies to the total.
 */

const DAY_MS = 86_400_000;
const MAX_COUNTED_CHARTS = 200;

// Days since the epoch, UTC. A result's age is counted in whole days, so the age factors
// (and every total) only change at midnight
export const utcDay = (date: Date) => Math.floor(date.getTime() / DAY_MS);

export const utcDayStart = (day: number) => new Date(day * DAY_MS);

// Full pp for a year, 75% at 2 years old, 25% from 5 years old
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

// Each chart's counted result on `day`: the one with the most pp after the age factor
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

// Each chart's pp on `day`, after the age factor
export const getChartPp = (results: PpResult[], day: number) => {
  const chartPp = new Map<number, number>();
  for (const [sharedChartId, { pp }] of getCountedResults(results, day)) {
    chartPp.set(sharedChartId, pp);
  }
  return chartPp;
};

// The top 200 charts count, by 0.95 ** place
const placeWeight = (index: number) => (index < MAX_COUNTED_CHARTS ? 0.95 ** index : 0);

// The total from each chart's pp (getChartPp)
export const getTotalFromChartPp = (chartPp: Map<number, number>) =>
  [...chartPp.values()]
    .sort((a, b) => b - a)
    .reduce((total, pp, index) => total + placeWeight(index) * pp, 0);

export const getTotalPp = (results: PpResult[], day: number) =>
  getTotalFromChartPp(getChartPp(results, day));

// The charts that count in the total, the most first: each one's counted result, its pp
// after the age factor, and the weight of its place
export const getCountedCharts = <T extends PpResult>(results: T[], day: number) =>
  [...getCountedResults(results, day).values()]
    .sort((a, b) => b.pp - a.pp)
    .slice(0, MAX_COUNTED_CHARTS)
    .map((chart, index) => ({ ...chart, weight: placeWeight(index) }));

// Totals are stored with 2 decimals (players.pp is float(8, 2)), rankings compare those
export const roundPp = (pp: number) => Math.round(pp * 100) / 100;
