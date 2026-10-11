import type { AppColor } from 'theme/tokens';

/**
 * The chart type color of a chart label as written in the DB
 * (e.g. 'S15', 'Sp3', 'D18', 'Dp5', 'HD18', 'COOP2').
 * SP/DP charts have their own colors; older mixes write them as `Sp`/`Dp`.
 */
export const chartLabelColor = (label: string): AppColor | undefined => {
  const upper = label.toUpperCase();
  if (upper.startsWith('HD')) return 'halfDouble';
  if (upper.startsWith('COOP')) return 'coop';
  if (upper.startsWith('DP')) return 'doublePerf';
  if (upper.startsWith('SP')) return 'singlePerf';
  if (upper.startsWith('D')) return 'double';
  if (upper.startsWith('S')) return 'single';
  return undefined;
};
