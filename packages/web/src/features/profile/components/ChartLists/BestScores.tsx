import { Button, Table, Text } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';

import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { ChartCells } from './ChartCells';
import { FadingDate } from './FadingDate';
import { ResultScore } from './ResultScore';
import { bestScoresInput, pageOptions } from './listQueries';

// All-time best: the player's best result on each chart by its full pp, however old, with
// how much of it the result still has after the age factor
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
                <ChartCells
                  sharedChartId={item.shared_chart}
                  label={item.label}
                  difficulty={item.difficulty}
                  name={item.full_name}
                />
                <Table.Td data-fit visibleFrom="xs" ta="right" fz="sm">
                  <FadingDate date={new Date(item.date)} />
                </Table.Td>
                <ResultScore score={item.score} isPass={item.is_pass} />
                {/* Under the pp, so phones show it too */}
                <Table.Td data-fit data-main ta="right">
                  {item.pp.toFixed(2)}
                  <Text span inherit fw={400} c="dimmed">
                    {' '}
                    pp
                  </Text>
                  <Text fz="xs" lh="xs" fw={400} c="dimmed">
                    {lang.PP_AGE_FACTOR(Math.round(item.ageFactor * 100))}
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
        charts.hasNextPage && (
          <Button leftSection={<MdExpandMore />} mt="xs" onClick={() => charts.fetchNextPage()}>
            {lang.SHOW_MORE}
          </Button>
        )
      )}
    </>
  );
};
