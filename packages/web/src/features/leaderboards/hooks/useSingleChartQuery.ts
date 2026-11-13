import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from 'utils/trpc';

export type SingleChartFilter = ApiInputs['charts']['chart'];

export const useSingleChartQuery = ({
  sharedChartId,
  focusedPlayerId,
}: {
  sharedChartId: number;
  focusedPlayerId?: number;
}): UseQueryResult<ApiOutputs['charts']['chart'], unknown> => {
  const input = useMemo(() => {
    return { sharedChartId, focusedPlayerId };
  }, [sharedChartId, focusedPlayerId]);

  return useQuery(api.charts.chart.queryOptions(input));
};
