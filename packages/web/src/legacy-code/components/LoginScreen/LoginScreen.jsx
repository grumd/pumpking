import React, { useState } from 'react';
import { connect } from 'react-redux';
import { GoogleLogin } from 'react-google-login';
import { FaGoogle } from 'react-icons/fa';
import Emoji from 'react-emoji-render';

import './login-screen.scss';

// reducers
import * as loginACs from 'legacy-code/reducers/login';

// redux
const mapStateToProps = (state) => {
  return {
    isLoading: state.login.isLoading,
    error: state.login.error,
  };
};

const mapDispatchToProps = {
  login: loginACs.login,
};

function LoginScreen({ isLoading, error, login }) {
  const [isClown, setClown] = useState(false);
  const onGoogleResponse = (res) => {
    if (res.error) {
      console.log('Google login response error:', res);
    } else {
      login(res);
    }
  };

  return (
    <div className="login-screen">
      <div className="site-name">pumpking</div>
      <div className="login-button">
        <GoogleLogin
          clientId="197132042723-cmibep21qf6dald9l2l01rif7l5dtd4s.apps.googleusercontent.com"
          buttonText="Login"
          onSuccess={onGoogleResponse}
          onFailure={onGoogleResponse}
          cookiePolicy={'single_host_origin'}
          render={({ onClick, disabled }) => (
            <button
              className="btn btn-dark btn-icon btn-sm"
              onClick={onClick}
              disabled={disabled || isLoading}
            >
              <FaGoogle />
              <span> login</span>
            </button>
          )}
        />
      </div>
      {error && <div className="error">{error.message}</div>}
      <div className="footer">
        By logging in, you agree to our{' '}
        {isClown ? (
          <Emoji text="🤡" className="clown" />
        ) : (
          <span onClick={() => setClown(true)} className="link-style">
            Privacy Policy
          </span>
        )}
      </div>
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginScreen);
