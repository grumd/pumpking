import { useQuery, useQueryClient } from '@tanstack/react-query';
import cookies from 'browser-cookies';
import { useEffect } from 'react';
import { useDiscordLogin as useDiscordLoginLib } from 'react-discord-login';

import { api } from 'utils/trpc';

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';

interface UseDiscordLoginOptions {
  redirectTo?: 'register' | 'login';
  code?: string;
}

interface RegistrationTokenData {
  email: string;
  registrationToken: string;
}

export const useDiscordLogin = ({ redirectTo = 'login', code }: UseDiscordLoginOptions = {}) => {
  const queryClient = useQueryClient();

  // Note: We use query params on root URL because Discord OAuth strips the hash from HashRouter URLs
  const redirectUri = `${window.location.origin}/?discord=true&redirect_to=${redirectTo}`;

  // For login, use a query (result is cached across StrictMode remounts)
  const loginQuery = useQuery({
    ...api.auth.loginDiscord.queryOptions({ code: code!, redirectUri }),
    enabled: redirectTo === 'login' && !!code,
    staleTime: Infinity,
    retry: false,
  });

  // Handle login success side effects
  useEffect(() => {
    if (loginQuery.data) {
      cookies.set('session', loginQuery.data.session, { expires: 14 });
      queryClient.invalidateQueries(api.user.current.queryFilter());
    }
  }, [loginQuery.data, queryClient]);

  // For registration, use a query (result is cached across StrictMode remounts)
  const registrationQuery = useQuery({
    ...api.auth.getDiscordRegToken.queryOptions({ code: code!, redirectUri }),
    enabled: redirectTo === 'register' && !!code,
    staleTime: Infinity,
    retry: false,
  });

  const { buildUrl } = useDiscordLoginLib({
    clientId: DISCORD_CLIENT_ID,
    redirectUri,
    responseType: 'code',
    scopes: ['identify', 'email'],
  });

  const handleLogin = () => {
    const url = buildUrl();
    window.location.href = url;
  };

  const data: RegistrationTokenData | undefined = registrationQuery.data;

  return {
    handleLogin,
    isLoading: loginQuery.isLoading || registrationQuery.isLoading,
    data,
    error: loginQuery.error?.message || registrationQuery.error?.message,
    isConfigured: !!DISCORD_CLIENT_ID,
  };
};
