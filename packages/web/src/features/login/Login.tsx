import { Alert } from '@mantine/core';

import { GoogleButton } from 'components/GoogleButton/GoogleButton';

import { useDiscordLogin } from 'hooks/useDiscordLogin';
import { useGoogleLogin } from 'hooks/useGoogleLogin';

import { useLanguage } from 'utils/context/translation';

import { DevLogin } from './DevLogin';
import { DiscordButton } from './DiscordButton';
import { LoginLayout } from './LoginLayout';

export function LoginScreen() {
  const lang = useLanguage();
  const google = useGoogleLogin();
  const discord = useDiscordLogin();

  const error = google.error || discord.error;

  return (
    <LoginLayout>
      <GoogleButton onSuccess={google.onSuccess} onError={google.onError} />
      {discord.isConfigured && (
        <DiscordButton href={discord.authUrl} label={lang.SIGN_IN_WITH_DISCORD} />
      )}
      {error && <Alert color="red">{error}</Alert>}
      <DevLogin />
    </LoginLayout>
  );
}
