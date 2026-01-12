import { Alert, Button } from '@mantine/core';
import { GoogleLogin } from '@react-oauth/google';
import { FaDiscord } from 'react-icons/fa';

import './login-screen.scss';

import { useDiscordLogin } from 'hooks/useDiscordLogin';
import { useGoogleLogin } from 'hooks/useGoogleLogin';

import { useLanguage } from 'utils/context/translation';

import { DevLogin } from './DevLogin';

export function LoginScreen() {
  const lang = useLanguage();
  const google = useGoogleLogin();
  const discord = useDiscordLogin();

  const error = google.error || discord.error;

  return (
    <div className="login-screen">
      <h1 className="site-name">pumpking</h1>
      <div className="login-button">
        {/* Hack to make the google login background transparent */}
        <div style={{ colorScheme: 'light' }}>
          <GoogleLogin theme="outline" onSuccess={google.onSuccess} onError={google.onError} />
        </div>
      </div>
      {discord.isConfigured && (
        <div className="login-button">
          <Button
            onClick={discord.handleLogin}
            loading={discord.isLoading}
            leftSection={<FaDiscord size={20} />}
            color="#5865F2"
          >
            {lang.SIGN_IN_WITH_DISCORD}
          </Button>
        </div>
      )}
      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}
      <DevLogin />
    </div>
  );
}
