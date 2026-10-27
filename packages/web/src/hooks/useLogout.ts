import { useMutation, useQueryClient } from '@tanstack/react-query';
import cookies from 'browser-cookies';

import { api } from 'utils/trpc';

export const useLogout = () => {
  const queryClient = useQueryClient();

  const onLoggedOut = () => {
    cookies.erase('session');
    queryClient.invalidateQueries(api.user.current.queryFilter());
    // The own profile's latest results show every play, others get only the bests
    void queryClient.resetQueries(api.players.latestResults.pathFilter());
  };

  const logoutMutation = useMutation(
    api.auth.logout.mutationOptions({
      onSuccess: onLoggedOut,
      onError: (err) => {
        console.error('Logout error:', err);
        // Still clear the cookie on error since we want to log out regardless
        onLoggedOut();
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
