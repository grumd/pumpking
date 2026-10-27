import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FaUserCog } from 'react-icons/fa';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';

import { ErrorAlert } from 'components/ErrorAlert/ErrorAlert';
import Loader from 'components/Loader/Loader';
import { Stat } from 'components/Stat/Stat';

import { routes } from 'constants/routes';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

export const ProfileHeader = (): JSX.Element => {
  const params = useParams();
  const lang = useLanguage();
  const user = useUser();
  const { data: ranking, isLoading } = useQuery(api.players.stats.queryOptions());

  if (!ranking || isLoading) {
    return <Loader />;
  }

  const currentPlayerIndex = ranking.findIndex((player) => player.id === Number(params.id));
  const currentPlayer = ranking[currentPlayerIndex];

  if (!currentPlayer) {
    return (
      <header>
        <ErrorAlert>{lang.PROFILE_NOT_FOUND}</ErrorAlert>
      </header>
    );
  }

  return (
    <Group component="header" justify="space-between" align="start" wrap="nowrap" px="sm" py="xs">
      <Group gap="lg">
        <Stat size="lg" label={lang.PLAYER} value={currentPlayer.nickname} />
        <Stat size="lg" label={lang.RANK} value={`#${currentPlayerIndex + 1}`} />
        <Stat size="lg" label={lang.PP_WITH_DECAY} value={currentPlayer.pp} />
        {currentPlayer.last_result_date && (
          <Stat
            size="lg"
            label={lang.LAST_TIME_PLAYED}
            value={getLongTimeAgo(lang, new Date(currentPlayer.last_result_date))}
          />
        )}
      </Group>
      {/* For admins: opens this player in the admin section */}
      {user.data?.is_admin && (
        <Tooltip label="Edit player">
          <ActionIcon
            component={Link}
            to={routes.admin.players.getPath({ id: currentPlayer.id })}
            size="lg"
            aria-label="Edit player"
          >
            <FaUserCog />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
};
