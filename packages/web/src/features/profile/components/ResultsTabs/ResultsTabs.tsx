import { Stack, Tabs } from '@mantine/core';
import { upperFirst } from '@mantine/hooks';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import {
  bestScoresInput,
  latestResultsInput,
  mostPlayedInput,
  pageOptions,
} from '../../hooks/profileTabQueries';
import { Achievements } from '../Achievements/Achievements';
import { HighestPpCharts } from '../HighestPpCharts/HighestPpCharts';
import { LatestResults } from '../LatestResults/LatestResults';
import { LevelAchievements } from '../LevelAchievements/LevelAchievements';
import { MostPlayedCharts } from '../MostPlayedCharts/MostPlayedCharts';
import tabsCss from '../profile-tabs.module.css';

// Loads the tabs that aren't open once the page has loaded what it shows. Not together with
// it: tRPC batches the queries started together into one request, which would then wait
// for the hidden tabs too
const usePrefetchHiddenTabs = (playerId: number | undefined) => {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const prefetchedFor = useRef<number | undefined>(undefined);
  const latestLoaded =
    queryClient.getQueryState(
      api.players.latestResults.infiniteQueryKey(latestResultsInput(playerId))
    )?.status === 'success';

  useEffect(() => {
    if (isFetching > 0 || !latestLoaded || prefetchedFor.current === playerId) {
      return;
    }
    prefetchedFor.current = playerId;
    void queryClient.prefetchInfiniteQuery(
      api.players.highestPpCharts.infiniteQueryOptions(bestScoresInput(playerId), pageOptions)
    );
    void queryClient.prefetchInfiniteQuery(
      api.players.mostPlayed.infiniteQueryOptions(mostPlayedInput(playerId), pageOptions)
    );
    void queryClient.prefetchQuery(api.players.achievements.queryOptions(playerId));
  }, [isFetching, latestLoaded, playerId, queryClient]);
};

export const ResultsTabs = (): JSX.Element => {
  const lang = useLanguage();
  const params = useParams();
  usePrefetchHiddenTabs(params.id ? Number(params.id) : undefined);
  return (
    <Card p="xs">
      {/* keepMounted={false}: the hidden tabs aren't rendered, their data is prefetched */}
      <Tabs
        variant="pills"
        defaultValue="latest"
        keepMounted={false}
        classNames={{ tab: tabsCss.tab }}
      >
        <Tabs.List mb="xs">
          <Tabs.Tab value="latest">{upperFirst(lang.LATEST)}</Tabs.Tab>
          <Tabs.Tab value="best">{upperFirst(lang.TOP_RESULTS)}</Tabs.Tab>
          <Tabs.Tab value="mostPlayed">{upperFirst(lang.MOST_PLAYED)}</Tabs.Tab>
          <Tabs.Tab value="achievements">{upperFirst(lang.ACHIEVEMENTS)}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="latest">
          <LatestResults />
        </Tabs.Panel>
        <Tabs.Panel value="best">
          <HighestPpCharts />
        </Tabs.Panel>
        <Tabs.Panel value="mostPlayed">
          <MostPlayedCharts />
        </Tabs.Panel>
        <Tabs.Panel value="achievements">
          <Stack gap="xs">
            <LevelAchievements />
            <Achievements />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
};
