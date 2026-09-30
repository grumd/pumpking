import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from 'utils/trpc';

// Deletes a result from its leaderboard. pp / exp are recalculated by the effects job
// a moment later, so the leaderboards and ranking are refetched again after that
export const useDeleteResult = (): UseMutationResult<
  ApiOutputs['admin']['results']['delete'],
  unknown,
  ApiInputs['admin']['results']['delete'],
  undefined
> => {
  const queryClient = useQueryClient();

  return useMutation(
    api.admin.results.delete.mutationOptions({
      onSuccess: () => {
        const refetch = () => {
          queryClient.invalidateQueries(api.charts.search.infiniteQueryFilter());
          queryClient.invalidateQueries(api.charts.chart.queryFilter());
          queryClient.invalidateQueries(api.players.stats.queryFilter());
        };
        refetch();
        setTimeout(refetch, 3000);
      },
    })
  );
};
