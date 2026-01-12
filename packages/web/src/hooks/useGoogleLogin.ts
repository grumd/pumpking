import type { CredentialResponse } from '@react-oauth/google';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import cookies from 'browser-cookies';
import { useState } from 'react';

import { api } from 'utils/trpc';

export const useGoogleLogin = () => {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loginMutation = useMutation(
    api.auth.loginGoogle.mutationOptions({
      onSuccess: (data) => {
        // Cookie expires in 14 days to match backend session validity
        cookies.set('session', data.session, { expires: 14 });
        queryClient.invalidateQueries(api.user.current.queryFilter());
      },
      onError: (err) => {
        console.error('Login error:', err);
        setError(err.message);
      },
    })
  );

  const onSuccess = (response: CredentialResponse) => {
    setError(null);
    if (response.credential) {
      loginMutation.mutate({ credential: response.credential });
    } else {
      setError('No credential received from Google');
    }
  };

  const onError = () => {
    console.error('Google login error');
    setError('Google login failed');
  };

  return {
    onSuccess,
    onError,
    isLoading: loginMutation.isPending,
    error,
  };
};
