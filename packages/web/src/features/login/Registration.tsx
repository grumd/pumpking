import { Alert, Anchor, Text } from '@mantine/core';
import { type CredentialResponse } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { GoogleButton } from 'components/GoogleButton/GoogleButton';

import { useDiscordLogin } from 'hooks/useDiscordLogin';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { DiscordButton } from './DiscordButton';
import { LoginLayout } from './LoginLayout';
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
    <LoginLayout>
      <Text>{lang.CREATE_NEW_ACCOUNT}</Text>
      <GoogleButton onSuccess={onGoogleSuccess} onError={onGoogleError} />
      {discord.isConfigured && (
        <DiscordButton href={discord.authUrl} label={lang.SIGN_UP_WITH_DISCORD} />
      )}
      {combinedError && <Alert color="red">{combinedError}</Alert>}
      <Anchor component={Link} to="/" size="sm">
        {lang.ALREADY_HAVE_ACCOUNT}
      </Anchor>
    </LoginLayout>
  );
}
