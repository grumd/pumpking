import { Button, Flex, SimpleGrid, Stack, Text } from '@mantine/core';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import { Grade } from 'components/Grade/Grade';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';
import { labelToTypeLevel } from 'utils/leaderboards';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import css from './highest-pp-charts.module.css';

const pageSize = 20;

export const HighestPpCharts = (): JSX.Element => {
  const params = useParams();
  const charts = api.players.highestPpCharts.useInfiniteQuery(
    { playerId: params.id ? Number(params.id) : undefined, pageSize },
    { getNextPageParam: (lastPage) => lastPage.nextCursor, initialCursor: 0 }
  );
  const lang = useLanguage();

  return (
    <Card p="xs" title={lang.BEST_SCORES}>
      <SimpleGrid spacing="xs" className={css.grid}>
        {charts.data?.pages.flatMap((page) =>
          page.items.map((item) => {
            const date = new Date(item.date);
            const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
            console.log({
              date,
              daysAgo,
            });
            const dateColor =
              daysAgo < 30
                ? 'green'
                : `rgba(255, 255, 255, ${Math.min(1, Math.max(0.2, 1 - (daysAgo - 30) / 360))})`;
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
                <NavLink
                  to={routes.leaderboard.sharedChart.getPath({
                    sharedChartId: item.shared_chart,
                  })}
                >
                  {item.full_name}
                </NavLink>
                <Text lh="1" c={dateColor} fz="xs">
                  {getLongTimeAgo(lang, date)}
                </Text>
                <Stack c="dark.2" gap="0.1em" ta="right">
                  <Text c="dark.1" lh="1em" size="xs">
                    {(item.pp * item.weight).toFixed(2)}pp
                  </Text>
                  <Text lh="1em" size="xs">
                    weighted {Math.round(item.weight * 100)}%
                  </Text>
                </Stack>
                <Grade
                  pl="0.5em"
                  h="1em"
                  w="100%"
                  score={item.score ?? 0}
                  isPass={item.is_pass ?? false}
                  scoring="phoenix"
                />
                <Text pl="0.5em" fw="bold" ta="right">
                  {item.pp?.toFixed(2)}
                  <Text span c="dark.2" ta="right">
                    {' '}
                    pp
                  </Text>
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
