import { type CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

// reducers
// import * as loginACs from 'reducers/login';

export function LoginScreen() {
  const [isClown, setClown] = useState(false);

  const onGoogleResponse = async (googleResponse: CredentialResponse) => {
    const loginResponse = await fetch(`${import.meta.env.VITE_API_V1_PATH}/login/google`, {
      method: 'post',
      body: JSON.stringify({ token: googleResponse.credential }),
      credentials: 'include',
    });
    console.log(loginResponse);
  };

  return (
    <div className="login-screen">
      <div className="site-name">pumpking</div>
      <div className="login-button">
        <GoogleLogin onSuccess={onGoogleResponse} />
      </div>
      {/* {error && <div className="error">{error.message}</div>} */}
      <div className="footer">
        By logging in, you agree to our{' '}
        {isClown ? <span>🤡</span> : <span onClick={() => setClown(true)}>Privacy Policy</span>}
      </div>
    </div>
  );
}
