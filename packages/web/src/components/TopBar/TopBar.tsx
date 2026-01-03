import { Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';

import './top-bar.scss';

import { routes } from 'constants/routes';

import { useLogout } from 'hooks/useLogout';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

export default function TopBar() {
  const lang = useLanguage();
  const { data: user, isLoading: isLoadingUser } = useQuery(api.user.current.queryOptions());
  const { logout, isLoading: isLoadingLogout } = useLogout();

  return (
    <header className="top-bar">
      <nav>
        <ul>
          <li>
            <NavLink to={routes.leaderboard.path}>{lang.LEADERBOARDS}</NavLink>
          </li>
          <li>
            <NavLink to={routes.ranking.path}>{lang.RANKING}</NavLink>
          </li>
          <li>
            <NavLink to={routes.songs.path}>{lang.SONGS}</NavLink>
          </li>
        </ul>
      </nav>
      <div className="login-container">
        <NavLink className="player-info" to={routes.profile.getPath({ id: user?.id })}>
          {user?.nickname ?? ''}
        </NavLink>
        <Button size="xs" onClick={logout} disabled={isLoadingLogout || isLoadingUser}>
          {lang.LOGOUT}
        </Button>
      </div>
    </header>
  );
}
