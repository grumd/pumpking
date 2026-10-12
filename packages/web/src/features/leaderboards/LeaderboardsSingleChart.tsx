import { useParams } from 'react-router';

import { EmptyState } from 'components/EmptyState/EmptyState';
import { ErrorAlert } from 'components/ErrorAlert/ErrorAlert';
import Loader from 'components/Loader/Loader';
import { PageContainer } from 'components/PageContainer/PageContainer';

import { useLanguage } from 'utils/context/translation';

import Chart from './components/charts/Chart';
import { useSingleChartQuery } from './hooks/useSingleChartQuery';

const LeaderboardsChartsList = (): JSX.Element => {
  const params = useParams();
  const chart = useSingleChartQuery({
    sharedChartId: params.sharedChartId ? Number(params.sharedChartId) : 0,
  });
  const lang = useLanguage();

  const chartsList = chart.data?.items.map((chart) => {
    return <Chart key={chart.id} chart={chart} />;
  });

  return (
    <PageContainer>
      {chart.isError ? (
        <ErrorAlert>
          {chart.error instanceof Error ? chart.error.message : lang.SOMETHING_WENT_WRONG}
        </ErrorAlert>
      ) : chart.isFetched && !chartsList?.length ? (
        <EmptyState>{lang.NOTHING_FOUND}</EmptyState>
      ) : chartsList?.length ? (
        chartsList
      ) : null}
      {chart.isLoading && <Loader />}
    </PageContainer>
  );
};

export default LeaderboardsChartsList;
