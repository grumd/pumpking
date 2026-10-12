import { Alert, Box } from '@mantine/core';
import { FaExclamationCircle } from 'react-icons/fa';
import { Virtuoso } from 'react-virtuoso';

import { EmptyState } from 'components/EmptyState/EmptyState';
import Loader from 'components/Loader/Loader';

import { useLanguage } from 'utils/context/translation';

import { useChartsQuery } from '../../hooks/useChartsQuery';
import Chart from './Chart';

export const LeaderboardsChartsList = (): JSX.Element => {
  const charts = useChartsQuery();
  const lang = useLanguage();

  const chartsList = charts.data?.pages.flatMap((page) => {
    return page.items.map((chart) => {
      return <Chart key={chart.id} chart={chart} />;
    });
  });

  return (
    <>
      {charts.isError ? (
        <Alert color="red" title={lang.ERROR} icon={<FaExclamationCircle />}>
          {charts.error instanceof Error ? charts.error.message : lang.SOMETHING_WENT_WRONG}
        </Alert>
      ) : charts.isFetched && !chartsList?.length ? (
        <EmptyState>{lang.NOTHING_FOUND}</EmptyState>
      ) : chartsList?.length ? (
        <Virtuoso
          endReached={() => {
            if (charts.hasNextPage && !charts.isFetching) charts.fetchNextPage();
          }}
          useWindowScroll
          data={chartsList}
          // Padding, not margin: Virtuoso measures the item's own box
          itemContent={(index) => <Box pt={index > 0 ? 'sm' : 0}>{chartsList[index]}</Box>}
        />
      ) : null}
      {charts.isFetching && <Loader />}
    </>
  );
};
