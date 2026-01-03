import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseInfiniteQueryResult, useInfiniteQuery } from '@tanstack/react-query';
import type { TRPCInfiniteData } from '@trpc/tanstack-react-query';
import { useMemo } from 'react';

import { api } from 'utils/trpc';

import { useFilter } from './useFilter';

export type ChartsFilter = Omit<ApiInputs['charts']['search'], 'cursor' | 'pageSize'>;

export type ChartApiOutput = ApiOutputs['charts']['search']['items'][number];

export type ResultApiOutput = ChartApiOutput['results'][number];

export const useChartsQuery = (): UseInfiniteQueryResult<
  TRPCInfiniteData<ApiInputs['charts']['search'], ApiOutputs['charts']['search']>,
  unknown
> => {
  const pageSize = 10;

  const filter = useFilter();

  const input = useMemo(() => {
    return { pageSize, ...filter };
  }, [filter]);

  return useInfiniteQuery(
    api.charts.search.infiniteQueryOptions(input, {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor;
      },
      initialCursor: 0,
    })
  );
};
