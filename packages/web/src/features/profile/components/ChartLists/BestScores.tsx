import { Anchor, Button, Table, Text } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { FadingDate } from './FadingDate';
import { ResultScore } from './ResultScore';
import { bestScoresInput, pageOptions } from './listQueries';

// The player's best result on each chart by its full pp, however old
export const BestScores = (): JSX.Element => {
  const params = useParams();
  const charts = useInfiniteQuery(
    api.players.highestPpCharts.infiniteQueryOptions(
      bestScoresInput(params.id ? Number(params.id) : undefined),
      pageOptions
    )
  );
  const lang = useLanguage();

  return (
    <>
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
                <Table.Td data-fit visibleFrom="xs" ta="right" fz="sm">
                  <FadingDate date={new Date(item.date)} />
                </Table.Td>
                <ResultScore score={item.score} isPass={item.is_pass} />
                <Table.Td data-fit data-main ta="right">
                  {item.pp?.toFixed(2)}
                  <Text span inherit fw={400} c="dimmed">
                    {' '}
                    pp
                  </Text>
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
    </>
  );
};
