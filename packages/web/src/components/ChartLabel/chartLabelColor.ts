import type { AppColor } from 'theme/tokens';

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
