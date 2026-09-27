import type { ApiOutputs } from '@/api/trpc/router';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const usePlayers = (): UseQueryResult<ApiOutputs['players']['list'], unknown> => {
  return useQuery(api.players.list.queryOptions());
};
