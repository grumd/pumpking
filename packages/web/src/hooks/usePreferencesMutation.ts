import type { ApiInputs, ApiOutputs } from '@/api/trpc/router';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const usePreferencesMutation = (): UseMutationResult<
  ApiOutputs['user']['preferencesMutation'],
  unknown,
  ApiInputs['user']['preferencesMutation'],
  undefined
> => {
  const queryClient = useQueryClient();

  const preferencesMutation = useMutation(
    api.user.preferencesMutation.mutationOptions({
      onSuccess: (newUser) => {
        queryClient.setQueryData(api.user.current.queryKey(), newUser);
        queryClient.invalidateQueries(api.charts.search.infiniteQueryFilter());
      },
    })
  );

  return preferencesMutation;
};
