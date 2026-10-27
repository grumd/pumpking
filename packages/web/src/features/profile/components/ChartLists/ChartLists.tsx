import { Tabs } from '@mantine/core';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';

import { Card } from 'components/Card/Card';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { BestScores } from './BestScores';
import { LatestResults } from './LatestResults';
import { MostPlayedCharts } from './MostPlayedCharts';
import { PpBreakdown } from './PpBreakdown';
import {
  bestScoresInput,
  latestResultsInput,
  mostPlayedInput,
  pageOptions,
  ppBreakdownInput,
} from './listQueries';

// Loads the tabs that aren't open once the page has loaded what it shows. Not together with
// it: tRPC batches the queries started together into one request, which would then wait
// for the hidden tabs too
const usePrefetchOtherTabs = (playerId: number | undefined) => {
  const queryClient = useQueryClient();
  // Re-renders when the page's queries finish, so the check below sees the latest results
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
      api.players.ppBreakdown.infiniteQueryOptions(ppBreakdownInput(playerId), pageOptions)
    );
    void queryClient.prefetchInfiniteQuery(
      api.players.mostPlayed.infiniteQueryOptions(mostPlayedInput(playerId), pageOptions)
    );
  }, [isFetching, latestLoaded, playerId, queryClient]);
};

// The player's charts: latest results, what makes up the total pp (current best), best
// scores by full pp (all-time best), most played
export const ChartLists = (): JSX.Element => {
  const lang = useLanguage();
  const params = useParams();
  usePrefetchOtherTabs(params.id ? Number(params.id) : undefined);

  return (
    <Card>
      {/* Only the open tab is mounted; the others are prefetched */}
      <Tabs variant="pills" defaultValue="latest" keepMounted={false}>
        <Tabs.List mb="xs">
          <Tabs.Tab value="latest">{lang.LATEST}</Tabs.Tab>
          <Tabs.Tab value="current">{lang.CURRENT_BEST}</Tabs.Tab>
          <Tabs.Tab value="allTime">{lang.ALL_TIME_BEST}</Tabs.Tab>
          <Tabs.Tab value="played">{lang.MOST_PLAYED}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="latest">
          <LatestResults />
        </Tabs.Panel>
        <Tabs.Panel value="current">
          <PpBreakdown />
        </Tabs.Panel>
        <Tabs.Panel value="allTime">
          <BestScores />
        </Tabs.Panel>
        <Tabs.Panel value="played">
          <MostPlayedCharts />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
};
