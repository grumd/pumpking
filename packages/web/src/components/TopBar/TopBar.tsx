import { Anchor, Button } from '@mantine/core';
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
            <Anchor fw="bold" size="xl" component={NavLink} to={routes.leaderboard.path}>
              {lang.LEADERBOARDS}
            </Anchor>
          </li>
          <li>
            <Anchor fw="bold" size="xl" component={NavLink} to={routes.ranking.path}>
              {lang.RANKING}
            </Anchor>
          </li>
          <li>
            <Anchor fw="bold" size="xl" component={NavLink} to={routes.songs.path}>
              {lang.SONGS}
            </Anchor>
          </li>
        </ul>
      </nav>
      <div className="login-container">
        <Anchor
          component={NavLink}
          className="player-info"
          to={routes.profile.getPath({ id: user?.id })}
        >
          {user?.nickname ?? ''}
        </Anchor>
        <Button size="xs" onClick={logout} disabled={isLoadingLogout || isLoadingUser}>
          {lang.LOGOUT}
        </Button>
      </div>
    </header>
  );
}
