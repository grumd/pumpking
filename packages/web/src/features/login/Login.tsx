import { GoogleLogin } from '@react-oauth/google';

import './login-screen.scss';

import { useLogin } from 'hooks/useLogin';

import { DevLogin } from './DevLogin';

export function LoginScreen() {
  const { onSuccess, onError, error } = useLogin();

  return (
    <div className="login-screen">
      <h1 className="site-name">pumpking</h1>
      <div className="login-button">
        <GoogleLogin onSuccess={onSuccess} onError={onError} />
      </div>
      {error && <div className="error">{error}</div>}
      <DevLogin />
    </div>
  );
}
