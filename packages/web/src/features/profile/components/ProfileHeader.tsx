import { Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { ErrorAlert } from 'components/ErrorAlert/ErrorAlert';
import Loader from 'components/Loader/Loader';
import { Stat } from 'components/Stat/Stat';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

export const ProfileHeader = (): JSX.Element => {
  const params = useParams();
  const lang = useLanguage();
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
    <Group component="header" gap="lg" px="sm" py="xs">
      <Stat size="lg" label={lang.PLAYER} value={currentPlayer.nickname} />
      <Stat size="lg" label={lang.RANK} value={`#${currentPlayerIndex + 1}`} />
      <Stat size="lg" label={lang.PP} value={currentPlayer.pp} />
      {currentPlayer.last_result_date && (
        <Stat
          size="lg"
          label={lang.LAST_TIME_PLAYED}
          value={getLongTimeAgo(lang, new Date(currentPlayer.last_result_date))}
        />
      )}
    </Group>
  );
};
