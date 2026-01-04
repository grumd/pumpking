import { Anchor, Button, Flex, SimpleGrid, Text } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FaPlay } from 'react-icons/fa';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';
import { labelToTypeLevel } from 'utils/leaderboards';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import css from './most-played-charts.module.css';

const pageSize = 10;

export const MostPlayedCharts = (): JSX.Element => {
  const params = useParams();
  const charts = useInfiniteQuery(
    api.players.mostPlayed.infiniteQueryOptions(
      { playerId: params.id ? Number(params.id) : undefined, pageSize },
      { getNextPageParam: (lastPage) => lastPage.nextCursor, initialCursor: 0 }
    )
  );
  const lang = useLanguage();

  return (
    <Card p="xs" title={lang.MOST_PLAYED_CHARTS}>
      <SimpleGrid spacing="xs" className={css.grid}>
        {charts.data?.pages.flatMap((page) =>
          page.items.map((item) => {
            const [chartType, chartLevel] = labelToTypeLevel(item.label);
            return (
              <Card key={item.shared_chart} fz="md" p="0.5em" level={2} className={css.row}>
                {chartType && chartLevel ? (
                  <Flex>
                    <ChartLabel type={chartType} level={chartLevel} />
                  </Flex>
                ) : (
                  <span>{item.label}</span>
                )}
                <Anchor
                  component={NavLink}
                  to={routes.leaderboard.sharedChart.getPath({
                    sharedChartId: item.shared_chart,
                  })}
                >
                  {item.full_name}
                </Anchor>
                <Text lh="1" c="grey" fz="xs" pr="2em">
                  {getLongTimeAgo(lang, new Date(item.latestDate))}
                </Text>
                <Text fw="bold" ta="right">
                  <FaPlay className={css.playIcon} />
                  {item.count}
                </Text>
              </Card>
            );
          })
        )}
      </SimpleGrid>
      {charts.isFetchingNextPage ? (
        <Loader />
      ) : (
        <Button
          leftSection={<MdExpandMore />}
          mt="xs"
          color="dark.4"
          onClick={() => charts.fetchNextPage()}
        >
          {lang.SHOW_MORE}
        </Button>
      )}
    </Card>
  );
};
