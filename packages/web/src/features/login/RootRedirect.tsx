import { Alert } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from 'constants/routes';

import { LoginScreen } from './Login';

/**
 * Handles Discord OAuth redirect by converting query params from window.location.search
 * to HashRouter-compatible format.
 *
 * This is necessary because Discord doesn't support redirecting to a hash-based URL
 */
export function RootRedirect() {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isDiscordRedirect = params.has('discord');
  const code = params.get('code');
  const redirectTo = params.get('redirect_to') as 'register' | 'login' | null;

  useEffect(() => {
    if (isDiscordRedirect && code && redirectTo) {
      // Remove 'discord' param as it was just a marker
      params.delete('discord');
      window.history.replaceState({}, document.title, window.location.pathname); // clear existing params

      // Navigate to HashRouter-compatible URL
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
