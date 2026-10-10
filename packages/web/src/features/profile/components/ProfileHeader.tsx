import { ActionIcon, Alert, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FaExclamationCircle, FaUserCog } from 'react-icons/fa';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';

import Loader from 'components/Loader/Loader';

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
        <Alert
          radius="md"
          variant="light"
          color="red"
          title={lang.ERROR}
          icon={<FaExclamationCircle />}
        >
          {lang.PROFILE_NOT_FOUND}
        </Alert>
      </header>
    );
  }

  return (
    <Group justify="space-between" align="start" wrap="nowrap" px="sm" py="xs">
      <Group gap="lg" style={{ rowGap: 'var(--mantine-spacing-xs)' }} justify="start">
        <Stack gap="0">
          <Text size="xs" c="grey">
            {lang.PLAYER}
          </Text>
          <Text size="2em" lh="1.2em">
            {currentPlayer?.nickname}
          </Text>
        </Stack>
        <Stack gap="0">
          <Text size="xs" c="grey">
            {lang.RANK}
          </Text>
          <Text size="2em" lh="1.2em">
            #{currentPlayerIndex + 1}
          </Text>
        </Stack>
        <Stack gap="0">
          <Text size="xs" c="grey">
            {lang.PP}
          </Text>
          <Text size="2em" lh="1.2em">
            {currentPlayer?.pp}
          </Text>
        </Stack>
        {currentPlayer?.last_result_date && (
          <Stack gap="0">
            <Text size="xs" c="grey">
              {lang.LAST_TIME_PLAYED}
            </Text>
            <Text size="2em" lh="1.2em">
              {getLongTimeAgo(lang, new Date(currentPlayer?.last_result_date))}
            </Text>
          </Stack>
        )}
      </Group>
      {user.data?.is_admin ? (
        <Tooltip label="Edit player">
          <ActionIcon
            component={Link}
            to={routes.admin.players.getPath({ id: currentPlayer.id })}
            variant="subtle"
            size="lg"
            aria-label="Edit player"
          >
            <FaUserCog />
          </ActionIcon>
        </Tooltip>
      ) : null}
    </Group>
  );
};
