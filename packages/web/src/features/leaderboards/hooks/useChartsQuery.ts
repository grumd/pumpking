import type { ApiOutputs } from '@/api/trpc/router';
import { useMemo } from 'react';

import { api } from 'utils/trpc';

import { useFilter } from './useFilter';

export type ChartsFilter = Partial<Parameters<typeof api.charts.search.useInfiniteQuery>[0]>;

export type ChartApiOutput = ApiOutputs['charts']['search']['items'][number];

export type ResultApiOutput = ChartApiOutput['results'][number];

export const useChartsQuery = () => {
  const pageSize = 10;

  const filter = useFilter();

  const input = useMemo(() => {
    return { pageSize, ...filter };
  }, [filter]);

  return api.charts.search.useInfiniteQuery(input, {
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor;
    },
    initialCursor: 0,
  });
};
