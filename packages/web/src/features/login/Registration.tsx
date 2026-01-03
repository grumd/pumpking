import { Alert, Anchor } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from 'utils/trpc';

import { RegistrationForm } from './RegistrationForm';
import './registration-page.scss';

interface RegistrationData {
  email: string;
  registrationToken: string;
}

export function RegistrationPage() {
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

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

  return (
    <div className="registration-page">
      <h1 className="site-name">pumpking</h1>
      <p>Create a new account</p>
      <div className="google-button">
        <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} />
      </div>
      {error && (
        <Alert color="red" variant="light" mt="md">
          {error}
        </Alert>
      )}
      <Anchor component={Link} to="/" mt="md" size="sm">
        Already have an account? Login
      </Anchor>
    </div>
  );
}
