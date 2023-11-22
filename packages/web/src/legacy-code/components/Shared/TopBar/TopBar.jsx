import React from 'react';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import _ from 'lodash/fp';

import './top-bar.scss';

// routes
import { routes } from 'legacy-code/constants/routes';

// reducers
import * as loginACs from 'legacy-code/reducers/login';

import { useLanguage } from 'utils/context/translation';

// redux
const mapStateToProps = (state) => {
  return {
    isLoadingLogin: state.login.isLoading,
    isLoadingUser: state.user.isLoading,
    user: state.user.data,
  };
};

const mapDispatchToProps = {
  login: loginACs.login,
  logout: loginACs.logout,
};

function TopBar({ isLoadingLogin, isLoadingUser, user, login, logout }) {
  const lang = useLanguage();
  return (
    <header className="top-bar">
      <nav>
        <ul>
          <li>
            <NavLink exact to={routes.leaderboard.path}>
              {lang.LEADERBOARDS}
            </NavLink>
          </li>
          <li>
            <NavLink exact to={routes.ranking.path}>
              {lang.RANKING}
            </NavLink>
          </li>
          <li>
            <NavLink exact to={routes.tournaments.path}>
              {lang.TOURNAMENTS}
            </NavLink>
          </li>
          <li>
            <NavLink exact to={routes.songs.path}>
              {lang.SONGS}
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="_flex-fill" />
      <div className="login-container">
        <NavLink
          className="player-info"
          exact
          to={routes.profile.getPath({ id: _.get('player.id', user) })}
        >
          {_.getOr('', 'player.nickname', user)}
        </NavLink>
        <button
          className="btn btn-dark btn-icon btn-sm"
          onClick={logout}
          disabled={isLoadingLogin || isLoadingUser}
        >
          <span> {lang.LOGOUT}</span>
        </button>
      </div>
    </header>
  );
}
export default connect(mapStateToProps, mapDispatchToProps)(TopBar);
