import type { ApiInputs } from '@/api/trpc/router';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from 'utils/trpc';

export const usePreferencesMutation = () => {
  const queryClient = useQueryClient();

  const preferencesMutation = useMutation(
    api.user.preferencesMutation.mutationOptions({
      onSuccess: (newUser) => {
        queryClient.setQueryData(api.user.current.queryKey(), newUser);
        queryClient.invalidateQueries({ queryKey: api.charts.search.queryKey() });
      },
    })
  );

  return preferencesMutation;
};
