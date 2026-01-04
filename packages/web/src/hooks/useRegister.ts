import { useMutation, useQueryClient } from '@tanstack/react-query';
import cookies from 'browser-cookies';

import { api } from 'utils/trpc';

export interface RegistrationData {
  registrationToken: string;
  nickname: string;
  region: string | null;
  arcadeName: string | null;
}

export const useRegister = () => {
  const queryClient = useQueryClient();

  const registerMutation = useMutation(
    api.auth.register.mutationOptions({
      onSuccess: (data) => {
        // Cookie expires in 14 days to match backend session validity
        cookies.set('session', data.session, { expires: 14 });
        queryClient.invalidateQueries(api.user.current.queryFilter());
      },
    })
  );

  const register = (data: RegistrationData) => {
    return registerMutation.mutateAsync(data);
  };

  return {
    register,
    isLoading: registerMutation.isPending,
    error: registerMutation.error?.message ?? null,
    reset: registerMutation.reset,
  };
};
