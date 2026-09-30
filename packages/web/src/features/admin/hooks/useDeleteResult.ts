import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const useDeleteResult = (): UseMutationResult<
  ApiOutputs['admin']['deleteResult'],
  unknown,
  ApiInputs['admin']['deleteResult'],
  undefined
> => {
  const queryClient = useQueryClient();

  const deleteResultMutation = useMutation(
    api.admin.deleteResult.mutationOptions({
      onSuccess: () => {
        // Invalidate chart queries to refresh the leaderboards
        queryClient.invalidateQueries(api.charts.search.infiniteQueryFilter());
        queryClient.invalidateQueries(api.charts.chart.queryFilter());
        // Invalidate player stats in case PP/EXP changed
        queryClient.invalidateQueries(api.players.stats.queryFilter());
      },
    })
  );

  return deleteResultMutation;
};
