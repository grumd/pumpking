import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const useUpdatePlayer = (): UseMutationResult<
  ApiOutputs['admin']['updatePlayer'],
  unknown,
  ApiInputs['admin']['updatePlayer'],
  undefined
> => {
  const queryClient = useQueryClient();

  const updatePlayerMutation = useMutation(
    api.admin.updatePlayer.mutationOptions({
      onSuccess: (_, variables) => {
        // Invalidate player admin info query
        queryClient.invalidateQueries(
          api.admin.getPlayerAdminInfo.queryFilter({ playerId: variables.playerId })
        );
        // Invalidate player stats in case hidden status changed
        queryClient.invalidateQueries(api.players.stats.queryFilter());
      },
    })
  );

  return updatePlayerMutation;
};
