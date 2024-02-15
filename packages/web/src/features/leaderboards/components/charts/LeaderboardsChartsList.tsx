import { Alert } from '@mantine/core';
import { FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import { Virtuoso } from 'react-virtuoso';

import './leaderboard.scss';

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
    <div className="top-list">
      {charts.isError ? (
        <Alert
          radius="md"
          variant="light"
          color="red"
          title={lang.ERROR}
          icon={<FaExclamationCircle />}
        >
          {charts.error.message}
        </Alert>
      ) : charts.isFetched && !chartsList?.length ? (
        <Alert radius="md" variant="default" title={lang.NOTHING_FOUND} icon={<FaInfoCircle />} />
      ) : chartsList?.length ? (
        <Virtuoso
          endReached={() => {
            if (charts.hasNextPage) charts.fetchNextPage();
          }}
          useWindowScroll
          data={chartsList}
          itemContent={(index) => chartsList[index]}
        />
      ) : null}
      {charts.isFetching && <Loader className="loader" />}
    </div>
  );
};
