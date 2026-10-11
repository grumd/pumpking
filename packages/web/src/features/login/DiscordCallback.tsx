import { Alert, Anchor, Text } from '@mantine/core';
import { NavLink, useParams } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useDiscordLogin } from 'hooks/useDiscordLogin';

import { useLanguage } from 'utils/context/translation';

import { LoginLayout } from './LoginLayout';
import { RegistrationForm } from './RegistrationForm';

export function DiscordCallback() {
  const lang = useLanguage();
  const params = useParams();

  const redirectTo = params.redirectTo === 'register' ? 'register' : 'login';
  const code = params.code;

  // Pass code to hook - registration query runs automatically when code is provided
  const discord = useDiscordLogin({ redirectTo, code });

  const backLink = redirectTo === 'register' ? routes.register.path : '/';
  const backText = redirectTo === 'register' ? lang.BACK_TO_REGISTRATION : lang.BACK_TO_LOGIN;

  if (discord.error) {
    return (
      <LoginLayout>
        <Alert color="red">{discord.error}</Alert>
        <Anchor component={NavLink} to={backLink}>
          {backText}
        </Anchor>
      </LoginLayout>
    );
  }

  // Registration flow completed - show registration form
  if (redirectTo === 'register' && discord.data) {
    return (
      <RegistrationForm
        email={discord.data.email}
        registrationToken={discord.data.registrationToken}
      />
    );
  }

  if (discord.isLoading) {
    return (
      <LoginLayout>
        <Loader />
        <Text>{redirectTo === 'register' ? lang.VERIFYING_DISCORD : lang.SIGNING_IN_DISCORD}</Text>
      </LoginLayout>
    );
  }

  if (!code) {
    return (
      <LoginLayout>
        <Alert color="red">{lang.NO_DISCORD_CODE}</Alert>
        <Anchor component={NavLink} to={backLink}>
          {backText}
        </Anchor>
      </LoginLayout>
    );
  }

  return null;
}
