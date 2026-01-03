import { Alert, Button } from '@mantine/core';
import { FaExclamationCircle, FaInfoCircle, FaPlusCircle } from 'react-icons/fa';
import { GiButtonFinger } from 'react-icons/gi';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';

import './components/charts/leaderboard.scss';

import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';

import Chart from './components/charts/Chart';
import { useSingleChartQuery } from './hooks/useSingleChartQuery';

const LeaderboardsChartsList = (): JSX.Element => {
  const params = useParams();
  const user = useUser();
  const chart = useSingleChartQuery({
    sharedChartId: params.sharedChartId ? Number(params.sharedChartId) : 0,
  });
  const lang = useLanguage();

  const chartsList = chart.data?.items.map((chart) => {
    return <Chart key={chart.id} chart={chart} />;
  });

  return (
    <div className="leaderboard-page">
      <div className="content">
        <div className="simple-search">
          {user.data?.can_add_results_manually && params.sharedChartId ? (
            <Button
              component={NavLink}
              to={routes.leaderboard.sharedChart.addResult.getPath({
                sharedChartId: params.sharedChartId,
              })}
              size="xs"
              ml="auto"
              disabled={chart.isLoading}
              leftSection={<FaPlusCircle />}
            >
              {lang.ADD_RESULT}
            </Button>
          ) : null}
        </div>
        <div className="top-list">
          {chart.isError ? (
            <Alert
              radius="md"
              variant="light"
              color="red"
              title={lang.ERROR}
              icon={<FaExclamationCircle />}
            >
              {chart.error instanceof Error ? chart.error.message : lang.SOMETHING_WENT_WRONG}
            </Alert>
          ) : chart.isFetched && !chartsList?.length ? (
            <Alert
              radius="md"
              variant="default"
              title={lang.NOTHING_FOUND}
              icon={<FaInfoCircle />}
            />
          ) : chartsList?.length ? (
            chartsList
          ) : null}
          {chart.isLoading && <Loader />}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsChartsList;
