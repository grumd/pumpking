import { Alert, Container, Group, Stack, Text } from '@mantine/core';
import { FaExclamationCircle } from 'react-icons/fa';
import { useParams } from 'react-router';

import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

export const ProfileHeader = (): JSX.Element => {
  const params = useParams();
  const lang = useLanguage();
  const { data: ranking, isLoading } = api.players.stats.useQuery();

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
    <Container p="md">
      <Group gap="xl" justify="start">
        <Stack gap="0">
          <Text size="sm" c="grey">
            {lang.PLAYER}
          </Text>
          <Text size="2.2em" lh="1.4em">
            {currentPlayer?.nickname}
          </Text>
        </Stack>
        <Stack gap="0">
          <Text size="sm" c="grey">
            {lang.RANK}
          </Text>
          <Text size="2.2em" lh="1.4em">
            #{currentPlayerIndex + 1}
          </Text>
        </Stack>
        <Stack gap="0">
          <Text size="sm" c="grey">
            {lang.PP}
          </Text>
          <Text size="2.2em" lh="1.4em">
            {currentPlayer?.pp}
          </Text>
        </Stack>
        {currentPlayer?.last_result_date && (
          <Stack gap="0">
            <Text size="sm" c="grey">
              {lang.LAST_TIME_PLAYED}
            </Text>
            <Text size="2.2em" lh="1.4em">
              {getLongTimeAgo(lang, new Date(currentPlayer?.last_result_date))}
            </Text>
          </Stack>
        )}
      </Group>
    </Container>
  );
};
