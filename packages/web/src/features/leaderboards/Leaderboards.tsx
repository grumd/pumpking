import { PageContainer } from 'components/PageContainer/PageContainer';

import { LeaderboardsChartsList } from './components/charts/LeaderboardsChartsList';
import { SearchForm } from './components/search/SearchForm';

const Leaderboards = (): JSX.Element => {
  return (
    <PageContainer>
      <SearchForm />
      <LeaderboardsChartsList />
    </PageContainer>
  );
};

export default Leaderboards;
