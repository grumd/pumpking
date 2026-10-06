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
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import { mostPlayedInput, pageOptions } from '../../hooks/profileTabQueries';
import css from './most-played-charts.module.css';

export const MostPlayedCharts = (): JSX.Element => {
  const params = useParams();
  const charts = useInfiniteQuery(
    api.players.mostPlayed.infiniteQueryOptions(
      mostPlayedInput(params.id ? Number(params.id) : undefined),
      pageOptions
    )
  );
  const lang = useLanguage();

  return (
    <>
      <SimpleGrid spacing="xs" className={css.grid}>
        {charts.data?.pages.flatMap((page) =>
          page.items.map((item) => {
            return (
              <Card key={item.shared_chart} fz="md" p="0.5em" level={2} className={css.row}>
                <Flex>
                  <ChartLabel label={item.label} />
                </Flex>
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
    </>
  );
};
