import { type CredentialResponse, GoogleLogin } from '@react-oauth/google';

import css from './google-button.module.css';

interface GoogleButtonProps {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}

export const GoogleButton = ({ onSuccess, onError }: GoogleButtonProps): JSX.Element => {
  return (
    <div className={css.googleButton}>
      <GoogleLogin theme="outline" onSuccess={onSuccess} onError={onError} />
    </div>
  );
};
