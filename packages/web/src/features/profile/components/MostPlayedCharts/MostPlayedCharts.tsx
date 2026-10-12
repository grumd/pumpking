import { Anchor, Button, Group, Table, rem } from '@mantine/core';
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
    <Card title={lang.MOST_PLAYED_CHARTS}>
      <Table variant="rows">
        <Table.Tbody>
          {charts.data?.pages.flatMap((page) =>
            page.items.map((item) => (
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
                <Table.Td data-fit visibleFrom="xs" ta="right" fz="sm" c="dimmed">
                  {getLongTimeAgo(lang, new Date(item.latestDate))}
                </Table.Td>
                <Table.Td data-fit data-main>
                  <Group gap="xxs" justify="flex-end" wrap="nowrap">
                    <FaPlay size={rem(10)} />
                    <span>{item.count}</span>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
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
