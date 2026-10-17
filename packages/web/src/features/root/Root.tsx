import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Loader from 'components/Loader/Loader';
import { PageContainer } from 'components/PageContainer/PageContainer';
import TopBar from 'components/TopBar/TopBar';

import { routes } from 'constants/routes';

import { DiscordCallback } from 'features/login/DiscordCallback';
import { RegistrationPage } from 'features/login/Registration';
import { RootRedirect } from 'features/login/RootRedirect';

import { useUser } from 'hooks/useUser';

const LazyAdmin = React.lazy(() => import('../admin/Admin'));
const LazyAddResults = React.lazy(() => import('../add-results/AddResults'));
const LazySingleChartLeaderboard = React.lazy(
  () => import('../leaderboards/LeaderboardsSingleChart')
);
const LazyNewLeaderboards = React.lazy(() => import('../leaderboards/Leaderboards'));
const LazyProfileNew = React.lazy(() => import('../profile/Profile'));
const LazyRanking = React.lazy(() => import('../ranking/Ranking'));
const LazySongsTop = React.lazy(() => import('../songs/SongsTop'));
const LazyTournaments = React.lazy(() => import('../tournaments/Tournaments'));
const LazyDesignSystem = React.lazy(() => import('../design-system/DesignSystem'));

const pageLoader = (
  <PageContainer>
    <Loader />
  </PageContainer>
);

// The design system reference page, dev only, with or without login
const designSystemRoute = import.meta.env.DEV ? (
  <Route
    path={routes.designSystem.path}
    element={
      <Suspense fallback={pageLoader}>
        <LazyDesignSystem />
      </Suspense>
    }
  />
) : null;

function Root() {
  const userQuery = useUser();

  if (userQuery.isLoading) {
    return pageLoader;
  }

  if (!userQuery.data) {
    return (
      <Routes>
        <Route path={routes.register.path} element={<RegistrationPage />} />
        <Route path={routes.discordCallback.path} element={<DiscordCallback />} />
        {designSystemRoute}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    );
  }

  return (
    <>
      <TopBar />
      <Suspense fallback={pageLoader}>
        <Routes>
          <Route path="/" element={<Navigate to={routes.leaderboard.path} />} />
          <Route path={routes.register.path} element={<Navigate to={routes.leaderboard.path} />} />
          <Route path={routes.leaderboard.path} element={<LazyNewLeaderboards />} />
          <Route
            path={routes.leaderboard.sharedChart.path}
            element={<LazySingleChartLeaderboard />}
          />
          <Route path={routes.addResults.path} element={<LazyAddResults />} />
          <Route path={routes.ranking.path + '/*'} element={<LazyRanking />} />
          <Route path={routes.profile.path} element={<LazyProfileNew />} />
          <Route path={routes.songs.path} element={<LazySongsTop />} />
          <Route path={routes.tournaments.path} element={<LazyTournaments />} />
          {designSystemRoute}
          <Route
            path={routes.admin.path + '/*'}
            element={
              userQuery.data.is_admin ? <LazyAdmin /> : <Navigate to={routes.leaderboard.path} />
            }
          />
          <Route path="*" element={<Navigate to={routes.leaderboard.path} />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default Root;
