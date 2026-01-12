import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import './Root.scss';
import './index.scss';

import Loader from 'components/Loader/Loader';
import TopBar from 'components/TopBar/TopBar';

import { routes } from 'constants/routes';

import { DiscordCallback } from 'features/login/DiscordCallback';
import { RegistrationPage } from 'features/login/Registration';
import { RootRedirect } from 'features/login/RootRedirect';

import { useUser } from 'hooks/useUser';

const LazyAddResult = React.lazy(() => import('../leaderboards/components/add-result/AddResult'));
const LazySingleChartLeaderboard = React.lazy(
  () => import('../leaderboards/LeaderboardsSingleChart')
);
const LazyNewLeaderboards = React.lazy(() => import('../leaderboards/Leaderboards'));
const LazyProfileNew = React.lazy(() => import('../profile/Profile'));
const LazyRanking = React.lazy(() => import('../ranking/Ranking'));
const LazySongsTop = React.lazy(() => import('../songs/SongsTop'));
// const LazyTournaments = React.lazy(() => import('./Tournaments/Tournaments'));

function Root() {
  const userQuery = useUser();

  if (userQuery.isLoading) {
    return (
      <div className="container">
        <Loader />
      </div>
    );
  }

  if (!userQuery.data) {
    return (
      <Routes>
        <Route path={routes.register.path} element={<RegistrationPage />} />
        <Route path={routes.discordCallback.path} element={<DiscordCallback />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    );
  }

  return (
    <div className="container">
      <TopBar />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Navigate to={routes.leaderboard.path} />} />
          <Route path={routes.register.path} element={<Navigate to={routes.leaderboard.path} />} />
          <Route path={routes.leaderboard.path} element={<LazyNewLeaderboards />} />
          <Route
            path={routes.leaderboard.sharedChart.path}
            element={<LazySingleChartLeaderboard />}
          />
          <Route path={routes.leaderboard.sharedChart.addResult.path} element={<LazyAddResult />} />
          <Route path={routes.ranking.path + '/*'} element={<LazyRanking />} />
          <Route path={routes.profile.path} element={<LazyProfileNew />} />
          <Route path={routes.songs.path} element={<LazySongsTop />} />
          {/* <Route path={routes.tournaments.path} element={<LazyTournaments />} /> */}
          <Route path="*" element={<Navigate to={routes.leaderboard.path} />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default Root;
