import { Alert, Anchor } from '@mantine/core';
import { NavLink, useParams } from 'react-router-dom';

import './login-screen.scss';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useDiscordLogin } from 'hooks/useDiscordLogin';

import { useLanguage } from 'utils/context/translation';

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
      <div className="login-screen">
        <h1 className="site-name">pumpking</h1>
        <Alert color="red" variant="light">
          {discord.error}
        </Alert>
        <Anchor component={NavLink} to={backLink} mt="md">
          {backText}
        </Anchor>
      </div>
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
      <div className="login-screen">
        <h1 className="site-name">pumpking</h1>
        <Loader />
        <p>{redirectTo === 'register' ? lang.VERIFYING_DISCORD : lang.SIGNING_IN_DISCORD}</p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="login-screen">
        <h1 className="site-name">pumpking</h1>
        <Alert color="red" variant="light">
          {lang.NO_DISCORD_CODE}
        </Alert>
        <Anchor component={NavLink} to={backLink} mt="md">
          {backText}
        </Anchor>
      </div>
    );
  }

  return null;
}
