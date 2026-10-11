import { Anchor, Button, Container, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { pageWidths } from 'theme/tokens';

import { NoticeIndicator } from 'components/NoticeIndicator/NoticeIndicator';

import { routes } from 'constants/routes';

import { useLogout } from 'hooks/useLogout';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import css from './top-bar.module.css';

const NavItem = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Anchor
    component={NavLink}
    to={to}
    className={css.link}
    fw="bold"
    fz={{ base: 'md', md: 'xl' }}
    lh="xs"
  >
    {children}
  </Anchor>
);

export default function TopBar() {
  const lang = useLanguage();
  const { data: user, isLoading: isLoadingUser } = useQuery(api.user.current.queryOptions());
  const { logout, isLoading: isLoadingLogout } = useLogout();
  const { data: notices } = useQuery(
    api.notices.unread.queryOptions(undefined, { enabled: !!user })
  );

  // Same width and side padding as PageContainer, so the nav lines up with the page
  return (
    <Container
      component="header"
      size={pageWidths.default}
      px={{ base: 'xs', sm: 'sm' }}
      className={css.topBar}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs" py="xs">
        <nav>
          <Group component="ul" gap={0} m={0} className={css.links}>
            <li>
              <NavItem to={routes.leaderboard.path}>{lang.LEADERBOARDS}</NavItem>
            </li>
            <li>
              <NavItem to={routes.ranking.path}>{lang.RANKING}</NavItem>
            </li>
            <li>
              <NavItem to={routes.songs.path}>{lang.SONGS}</NavItem>
            </li>
            <li>
              <NoticeIndicator unread={!!notices?.tournament}>
                <NavItem to={routes.tournaments.path}>{lang.TOURNAMENTS}</NavItem>
              </NoticeIndicator>
            </li>
            {user?.is_admin && (
              <li>
                <NavItem to={routes.admin.path}>{lang.ADMIN}</NavItem>
              </li>
            )}
          </Group>
        </nav>
        <Group gap="xs" wrap="nowrap">
          <Anchor
            component={NavLink}
            to={routes.profile.getPath({ id: user?.id })}
            fz="sm"
            fw={600}
          >
            {user?.nickname ?? ''}
          </Anchor>
          <Button size="xs" onClick={logout} disabled={isLoadingLogout || isLoadingUser}>
            {lang.LOGOUT}
          </Button>
        </Group>
      </Group>
    </Container>
  );
}
