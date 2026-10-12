import { Group, Progress, Stack, Text, rem } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';
import { getRankIndex, ranks } from 'components/ExpRankImg/expRanks';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import css from './exp-progress.module.css';

const rankWidth = rem(44);

export const ExpProgress = (): React.ReactNode => {
  const params = useParams();
  const lang = useLanguage();
  const playerId = params.id ? Number(params.id) : undefined;
  const { data: ranking } = useQuery(api.players.stats.queryOptions());

  const playerExp = ranking?.find((x) => x.id === playerId)?.exp;

  if (playerExp == null) return null;

  const currentRankIndex = getRankIndex(playerExp);
  const currentRank = ranks[currentRankIndex];
  const nextRank = ranks[currentRankIndex + 1];
  const expProgress = nextRank
    ? (playerExp - currentRank.threshold) / (nextRank?.threshold - currentRank.threshold)
    : 1;

  return (
    <Group px="sm" pb="sm" wrap="nowrap">
      <Stack align="center" gap="xxs" w={rankWidth}>
        <ExpRankImg rankIndex={currentRankIndex} />
        <Text size="xs">{currentRank.threshold}</Text>
      </Stack>
      <Stack align="center" gap="xxs" flex={1}>
        {nextRank ? (
          <Text size="sm">
            <Text span c="gold" inherit>
              {Math.floor(playerExp - currentRank.threshold)}
            </Text>{' '}
            / {nextRank.threshold - currentRank.threshold}
          </Text>
        ) : null}
        <Progress
          w="100%"
          size="lg"
          color="gold"
          value={Math.floor(100 * expProgress)}
          classNames={{ root: css.root, section: css.section }}
        />
        <Text size="sm">
          {lang.TOTAL}:{' '}
          <Text span c="gold" inherit>
            {playerExp}
          </Text>
        </Text>
      </Stack>
      {nextRank && (
        <Stack align="center" gap="xxs" w={rankWidth}>
          <ExpRankImg rankIndex={currentRankIndex + 1} />
          <Text size="xs">{nextRank.threshold}</Text>
        </Stack>
      )}
    </Group>
  );
};
