import { LeaderboardsChartsList } from './chartsList/LeaderboardsChartsList';
import { SearchForm } from './search/SearchForm';

const Leaderboards = (): JSX.Element => {
  return (
    <div className="leaderboard-page">
      <div className="content">
        <SearchForm />
        <div className="top-list">
          <LeaderboardsChartsList />
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
