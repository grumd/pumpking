import { useMutation, useQueryClient } from '@tanstack/react-query';
import cookies from 'browser-cookies';

import { api } from 'utils/trpc';

export const useLogout = () => {
  const queryClient = useQueryClient();

  const logoutMutation = useMutation(
    api.auth.logout.mutationOptions({
      onSuccess: () => {
        cookies.erase('session');
        queryClient.invalidateQueries(api.user.current.queryFilter());
      },
      onError: (err) => {
        console.error('Logout error:', err);
        // Still clear the cookie on error since we want to log out regardless
        cookies.erase('session');
        queryClient.invalidateQueries(api.user.current.queryFilter());
      },
    })
  );

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    logout,
    isLoading: logoutMutation.isPending,
  };
};
