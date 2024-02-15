import React, { Suspense, useEffect } from 'react';
import ReactModal from 'react-modal';
import { useDispatch, useSelector } from 'react-redux';
import 'react-responsive-ui/style.css';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.scss';
import './index.scss';

import LoginScreen from 'legacy-code/components/LoginScreen/LoginScreen';
import Loader from 'legacy-code/components/Shared/Loader';
import TopBar from 'legacy-code/components/Shared/TopBar/TopBar';
import { routes } from 'legacy-code/constants/routes';
import { fetchUser } from 'legacy-code/reducers/user';

const LazyAddResult = React.lazy(() => import('../../features/leaderboards/AddResult'));
const LazySingleChartLeaderboard = React.lazy(() =>
  import('../../features/leaderboards/LeaderboardsSingleChart')
);
const LazyNewLeaderboards = React.lazy(() => import('../../features/leaderboards/Leaderboards'));
const LazyProfileNew = React.lazy(() => import('../../features/profile/Profile'));
const LazyProfile = React.lazy(() => import('./Profile/Profile'));
const LazyProfileCompare = React.lazy(() => import('./ProfileCompare/ProfileCompare'));
const LazyTournaments = React.lazy(() => import('./Tournaments/Tournaments'));
const LazyRanking = React.lazy(() => import('../../features/ranking/Ranking'));
const LazyResultsByLevel = React.lazy(() => import('./Profile/ResultsByLevel'));
const LazySongsTop = React.lazy(() => import('./SongsTop/SongsTop'));

ReactModal.setAppElement('#root');

function App() {
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.data);
  const isLoading = useSelector((state) => state.user.isLoading);

  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="container">
        <Loader />
      </div>
    );
  }

  if (!userData || !userData.player) {
    return <LoginScreen />;
  }

  return (
    <div className="container">
      <TopBar />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Navigate to={routes.leaderboard.path} />} />
          <Route path={routes.leaderboard.path} element={<LazyNewLeaderboards />} />
          <Route
            path={routes.leaderboard.sharedChart.path}
            element={<LazySingleChartLeaderboard />}
          />
          <Route path={routes.leaderboard.sharedChart.addResult.path} element={<LazyAddResult />} />
          <Route path={routes.ranking.path + '/*'} element={<LazyRanking />} />
          <Route path={routes.profileOld.path} element={<LazyProfile />} />
          <Route path={routes.profile.path} element={<LazyProfileNew />} />
          <Route path={routes.profile.resultsByLevel.path} element={<LazyResultsByLevel />} />
          <Route path={routes.profile.resultsByLevel.level.path} element={<LazyResultsByLevel />} />
          <Route path={routes.profile.compare.path} element={<LazyProfileCompare />} />
          <Route path={routes.songs.path} element={<LazySongsTop />} />
          <Route path={routes.tournaments.path} element={<LazyTournaments />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
