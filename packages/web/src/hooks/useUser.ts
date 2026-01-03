import type { ApiOutputs } from '@/api/trpc/router';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const useUser = (): UseQueryResult<ApiOutputs['user']['current'], unknown> => {
  return useQuery(api.user.current.queryOptions());
};
