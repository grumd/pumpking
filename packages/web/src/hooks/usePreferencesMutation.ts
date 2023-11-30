import { useQueryClient } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';

import { api } from 'utils/trpc';

export const usePreferencesMutation = () => {
  const queryClient = useQueryClient();

  const preferencesMutation = api.user.preferencesMutation.useMutation({
    onSuccess: (newUser) => {
      queryClient.setQueryData(getQueryKey(api.user.current, undefined, 'query'), newUser);
      queryClient.invalidateQueries(getQueryKey(api.charts.search));
    },
  });

  return preferencesMutation;
};
