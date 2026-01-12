import { Alert, Anchor, Button } from '@mantine/core';
import { type CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import './registration-page.scss';

import { useDiscordLogin } from 'hooks/useDiscordLogin';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { RegistrationForm } from './RegistrationForm';

interface RegistrationData {
  email: string;
  registrationToken: string;
}

export function RegistrationPage() {
  const lang = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  const discord = useDiscordLogin({ redirectTo: 'register' });

  const getTokenMutation = useMutation(
    api.auth.getRegistrationToken.mutationOptions({
      onSuccess: (data) => {
        setRegistrationData(data);
      },
      onError: (err) => {
        setError(err.message);
      },
    })
  );

  const onGoogleSuccess = (response: CredentialResponse) => {
    setError(null);
    setRegistrationData(null);
    if (response.credential) {
      getTokenMutation.mutate({ credential: response.credential });
    } else {
      setError('No credential received from Google');
    }
  };

  const onGoogleError = () => {
    setError('Google authentication failed');
  };

  if (registrationData) {
    return (
      <RegistrationForm
        email={registrationData.email}
        registrationToken={registrationData.registrationToken}
      />
    );
  }

  const combinedError = error || discord.error;

  return (
    <div className="registration-page">
      <h1 className="site-name">pumpking</h1>
      <p>{lang.CREATE_NEW_ACCOUNT}</p>
      <div className="google-button">
        {/* Hack to make the google login background transparent */}
        <div style={{ colorScheme: 'light' }}>
          <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} />
        </div>
      </div>
      {discord.isConfigured && (
        <Button
          component="a"
          href={discord.authUrl}
          leftSection={<FaDiscord size={20} />}
          color="#5865F2"
        >
          {lang.SIGN_UP_WITH_DISCORD}
        </Button>
      )}
      {combinedError && (
        <Alert color="red" variant="light" mt="md">
          {combinedError}
        </Alert>
      )}
      <Anchor component={Link} to="/" mt="md" size="sm">
        {lang.ALREADY_HAVE_ACCOUNT}
      </Anchor>
    </div>
  );
}
