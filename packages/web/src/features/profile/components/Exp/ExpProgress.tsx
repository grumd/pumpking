import { Group, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import css from './exp-progress.module.scss';

import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';
import { getRankIndex, ranks } from 'components/ExpRankImg/expRanks';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

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
    <Group pl="sm" pr="sm" pb="sm" fz="lg">
      <Stack align="center" gap="0.25em" w="2.5em">
        <ExpRankImg rankIndex={currentRankIndex} />
        <Text size="0.6rem">{currentRank.threshold}</Text>
      </Stack>
      <Stack align="center" gap="0" className={css.expLineBlock}>
        {nextRank ? (
          <span>
            <Text size="sm" span c="gold">
              {Math.floor(playerExp - currentRank.threshold)}
            </Text>
            <Text size="sm" span>
              {' '}
              / {nextRank.threshold - currentRank.threshold}
            </Text>
          </span>
        ) : null}
        <div className={css.expLine}>
          <div className={css.taken} style={{ width: Math.floor(100 * expProgress) + '%' }}></div>
          <div
            className={css.rest}
            style={{ width: 100 - Math.ceil(100 * expProgress) + '%' }}
          ></div>
        </div>
        <span>
          <Text size="sm" span>
            {lang.TOTAL}:{' '}
            <Text span c="gold" inherit>
              {playerExp}
            </Text>
          </Text>
        </span>
      </Stack>
      {nextRank && (
        <Stack align="center" gap="0.25em" w="2.5em">
          <ExpRankImg rankIndex={currentRankIndex + 1} />
          <Text size="0.6rem">{nextRank.threshold}</Text>
        </Stack>
      )}
    </Group>
  );
};
