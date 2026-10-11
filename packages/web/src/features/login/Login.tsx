import { Alert, Button } from '@mantine/core';
import { FaDiscord } from 'react-icons/fa';

import { GoogleButton } from 'components/GoogleButton/GoogleButton';

import { useDiscordLogin } from 'hooks/useDiscordLogin';
import { useGoogleLogin } from 'hooks/useGoogleLogin';

import { useLanguage } from 'utils/context/translation';

import { DevLogin } from './DevLogin';
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
        <Button
          component="a"
          href={discord.authUrl}
          leftSection={<FaDiscord size={20} />}
          color="discord"
        >
          {lang.SIGN_IN_WITH_DISCORD}
        </Button>
      )}
      {error && <Alert color="red">{error}</Alert>}
      <DevLogin />
    </LoginLayout>
  );
}
