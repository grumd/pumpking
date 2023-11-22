import { Virtuoso } from 'react-virtuoso';

import { useChartsQuery } from '../hooks/useChartsQuery';
import Chart from './Chart';
import './leaderboard.scss';

export const LeaderboardsChartsList = (): JSX.Element => {
  const charts = useChartsQuery();

  console.log('pages', charts.data?.pages);
  console.log('isLoading', charts.isLoading);

  const chartsList = charts.data?.pages.map((page) => {
    return page.items.map((chart) => {
      return <Chart key={chart.id} chart={chart} />;
    });
  });

  console.log({
    data: charts.data?.pages,
    chartsList,
  });

  return (
    <div className="top-list">
      {chartsList && (
        <Virtuoso
          endReached={() => {
            if (charts.hasNextPage) charts.fetchNextPage();
          }}
          useWindowScroll
          data={chartsList}
          itemContent={(index) => chartsList[index]}
        />
      )}
    </div>
  );
};
