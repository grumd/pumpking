import { useMemo } from 'react';

import { api } from 'utils/trpc';

import { useFilter } from './useFilter';

export type SingleChartFilter = Partial<Parameters<typeof api.charts.chart.useQuery>[0]>;

export const useSingleChartQuery = ({ sharedChartId }: { sharedChartId: number }) => {
  const filter = useFilter();

  const input = useMemo(() => {
    return { scoring: filter.scoring, sharedChartId };
  }, [filter.scoring, sharedChartId]);

  return api.charts.chart.useQuery(input);
};
