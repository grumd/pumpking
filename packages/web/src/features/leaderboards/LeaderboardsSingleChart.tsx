import { useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from 'components/EmptyState/EmptyState';
import { ErrorAlert } from 'components/ErrorAlert/ErrorAlert';
import Loader from 'components/Loader/Loader';
import { PageContainer } from 'components/PageContainer/PageContainer';

import { useLanguage } from 'utils/context/translation';

import Chart from './components/charts/Chart';
import { useSingleChartQuery } from './hooks/useSingleChartQuery';

const LeaderboardsChartsList = (): JSX.Element => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const focusedPlayerId = Number(searchParams.get('focusedPlayerId')) || undefined;
  const chart = useSingleChartQuery({
    sharedChartId: params.sharedChartId ? Number(params.sharedChartId) : 0,
  });
  const lang = useLanguage();

  return (
    <PageContainer>
      {chart.isError ? (
        <ErrorAlert>
          {chart.error instanceof Error ? chart.error.message : lang.SOMETHING_WENT_WRONG}
        </ErrorAlert>
      ) : chart.data ? (
        <Chart key={chart.data.id} chart={chart.data} focusedPlayerId={focusedPlayerId} />
      ) : chart.isFetched ? (
        <EmptyState>{lang.NOTHING_FOUND}</EmptyState>
      ) : null}
      {chart.isLoading && <Loader />}
    </PageContainer>
  );
};

export default LeaderboardsChartsList;
