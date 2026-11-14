import { Alert } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from 'constants/routes';

import { LoginScreen } from './Login';

export function RootRedirect() {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isDiscordRedirect = params.has('discord');
  const code = params.get('code');
  const redirectTo = params.get('redirect_to') as 'register' | 'login' | null;

  useEffect(() => {
    if (isDiscordRedirect && code && redirectTo) {
      params.delete('discord');
      window.history.replaceState({}, document.title, window.location.pathname);

      navigate(routes.discordCallback.getPath({ code, redirectTo }), { replace: true });
    }
  }, [navigate, isDiscordRedirect, params, code, redirectTo]);

  if (isDiscordRedirect) {
    if (!code || !redirectTo) {
      return <Alert>Invalid Discord callback parameters</Alert>;
    }
    return null;
  }

  return <LoginScreen />;
}
