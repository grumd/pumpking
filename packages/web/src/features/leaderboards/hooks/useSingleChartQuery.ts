import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from 'utils/trpc';

export type SingleChartFilter = ApiInputs['charts']['chart'];

export const useSingleChartQuery = ({
  sharedChartId,
}: {
  sharedChartId: number;
}): UseQueryResult<ApiOutputs['charts']['chart'], unknown> => {
  const input = useMemo(() => {
    return { sharedChartId };
  }, [sharedChartId]);

  return useQuery(api.charts.chart.queryOptions(input));
};
