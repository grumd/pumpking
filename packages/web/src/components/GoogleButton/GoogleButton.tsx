import { type CredentialResponse, GoogleLogin } from '@react-oauth/google';

import css from './google-button.module.css';

interface GoogleButtonProps {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}

// Google's sign-in button. It renders in an iframe with a white background on dark pages
// unless its container uses the light color scheme
export const GoogleButton = ({ onSuccess, onError }: GoogleButtonProps): JSX.Element => {
  return (
    <div className={css.googleButton}>
      <GoogleLogin theme="outline" onSuccess={onSuccess} onError={onError} />
    </div>
  );
};
