import { Anchor, Button, Table, Text, rem } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';

import { Card } from 'components/Card/Card';
import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import { Grade } from 'components/Grade/Grade';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import css from './highest-pp-charts.module.css';

const pageSize = 20;

export const HighestPpCharts = (): JSX.Element => {
  const params = useParams();
  const charts = useInfiniteQuery(
    api.players.highestPpCharts.infiniteQueryOptions(
      { playerId: params.id ? Number(params.id) : undefined, pageSize },
      { getNextPageParam: (lastPage) => lastPage.nextCursor, initialCursor: 0 }
    )
  );
  const lang = useLanguage();

  return (
    <Card title={lang.BEST_SCORES}>
      <Table variant="rows">
        <Table.Tbody>
          {charts.data?.pages.flatMap((page) =>
            page.items.map((item) => {
              const date = new Date(item.date);
              const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
              const dateOpacity = Math.min(1, Math.max(0.55, 1 - (daysAgo - 30) / 360));

              return (
                <Table.Tr key={item.shared_chart}>
                  <Table.Td data-fit>
                    <ChartLabel label={item.label} />
                  </Table.Td>
                  <Table.Td>
                    <Anchor
                      component={NavLink}
                      to={routes.leaderboard.sharedChart.getPath({
                        sharedChartId: item.shared_chart,
                      })}
                    >
                      {item.full_name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td data-fit visibleFrom="sm" ta="right" fz="sm">
                    {/* The last month in green, older dates fade */}
                    <Text
                      span
                      inherit
                      c={daysAgo < 30 ? 'green' : undefined}
                      className={css.fadingDate}
                      style={{ '--date-opacity': dateOpacity }}
                    >
                      {getLongTimeAgo(lang, date)}
                    </Text>
                  </Table.Td>
                  <Table.Td data-fit visibleFrom="xs" ta="right" fz="xs" lh="xs" c="dimmed">
                    <div>{(item.pp * item.weight).toFixed(2)}pp</div>
                    <div>weighted {Math.round(item.weight * 100)}%</div>
                  </Table.Td>
                  <Table.Td data-fit>
                    <Grade
                      h={rem(18)}
                      w={rem(44)}
                      score={item.score ?? 0}
                      isPass={item.is_pass ?? false}
                    />
                  </Table.Td>
                  <Table.Td data-fit data-main ta="right">
                    {item.pp?.toFixed(2)}
                    <Text span inherit fw={400} c="dimmed">
                      {' '}
                      pp
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
      {charts.isFetchingNextPage ? (
        <Loader />
      ) : (
        <Button leftSection={<MdExpandMore />} mt="xs" onClick={() => charts.fetchNextPage()}>
          {lang.SHOW_MORE}
        </Button>
      )}
    </Card>
  );
};
