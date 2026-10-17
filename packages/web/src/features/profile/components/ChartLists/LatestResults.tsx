import { Anchor, Button, Table, Text } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';

import { ChartLabel } from 'components/ChartLabel/ChartLabel';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';
import { api } from 'utils/trpc';

import { ResultScore } from './ResultScore';
import { latestResultsInput, pageOptions } from './listQueries';

// The player's results, newest first
export const LatestResults = (): JSX.Element => {
  const params = useParams();
  const results = useInfiniteQuery(
    api.players.latestResults.infiniteQueryOptions(
      latestResultsInput(params.id ? Number(params.id) : undefined),
      pageOptions
    )
  );
  const lang = useLanguage();

  return (
    <>
      <Table variant="rows">
        <Table.Tbody>
          {results.data?.pages.flatMap((page) =>
            page.items.map((item) => (
              <Table.Tr key={item.id}>
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
                <Table.Td data-fit visibleFrom="sm" ta="right" fz="sm" c="dimmed">
                  {getLongTimeAgo(lang, new Date(item.date))}
                </Table.Td>
                <ResultScore score={item.score} isPass={item.is_pass} />
                <Table.Td data-fit data-main ta="right">
                  {item.pp != null && (
                    <>
                      {item.pp.toFixed(2)}
                      <Text span inherit fw={400} c="dimmed">
                        {' '}
                        pp
                      </Text>
                    </>
                  )}
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
      {results.isFetchingNextPage ? (
        <Loader />
      ) : (
        results.hasNextPage && (
          <Button leftSection={<MdExpandMore />} mt="xs" onClick={() => results.fetchNextPage()}>
            {lang.SHOW_MORE}
          </Button>
        )
      )}
    </>
  );
};
