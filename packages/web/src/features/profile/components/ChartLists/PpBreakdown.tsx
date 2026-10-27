import { Button, Table, Text, rem } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MdExpandMore } from 'react-icons/md';
import { useParams } from 'react-router';

import { Grade } from 'components/Grade/Grade';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import { ChartCells } from './ChartCells';
import { FadingDate } from './FadingDate';
import { PpSummary } from './PpSummary';
import { pageOptions, ppBreakdownInput } from './listQueries';

// Current best: the charts that make up the total pp, by how much each one adds after the
// age factor and the weight of its place
export const PpBreakdown = (): JSX.Element => {
  const params = useParams();
  const charts = useInfiniteQuery(
    api.players.ppBreakdown.infiniteQueryOptions(
      ppBreakdownInput(params.id ? Number(params.id) : undefined),
      pageOptions
    )
  );
  const lang = useLanguage();

  return (
    <>
      <PpSummary label={lang.PP_WITH_DECAY} totalPp={charts.data?.pages[0]?.totalPp} />
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
                <Table.Td data-fit visibleFrom="sm" ta="right" fz="sm">
                  <FadingDate date={new Date(item.date)} />
                </Table.Td>
                <Table.Td data-fit visibleFrom="xs" ta="right" fz="sm" c="dimmed">
                  {item.pp.toFixed(2)}pp
                </Table.Td>
                <Table.Td data-fit visibleFrom="sm" ta="right" fz="xs" lh="xs" c="dimmed">
                  <div>{lang.PP_AGE_FACTOR(Math.round(item.ageFactor * 100))}</div>
                  <div>{lang.PP_PLACE_WEIGHT(Math.round(item.weight * 100))}</div>
                </Table.Td>
                <Table.Td data-fit>
                  <Grade h={rem(18)} w={rem(44)} score={item.score ?? 0} isPass={item.is_pass} />
                </Table.Td>
                <Table.Td data-fit data-main ta="right">
                  {item.contribution.toFixed(2)}
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
        charts.hasNextPage && (
          <Button leftSection={<MdExpandMore />} mt="xs" onClick={() => charts.fetchNextPage()}>
            {lang.SHOW_MORE}
          </Button>
        )
      )}
    </>
  );
};
