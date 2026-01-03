import type { ApiOutputs } from '@/api/trpc/router';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const usePlayerPpHistory = ({
  playerId,
}: {
  playerId: number | undefined;
}): UseQueryResult<ApiOutputs['players']['pp'], unknown> => {
  return useQuery(api.players.pp.queryOptions(playerId));
};
