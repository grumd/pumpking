import _ from 'lodash/fp';
import React, { Suspense, useEffect } from 'react';
import ReactModal from 'react-modal';
import { useDispatch, useSelector } from 'react-redux';
import 'react-responsive-ui/style.css';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.scss';

import LoginScreen from 'legacy-code/components/LoginScreen/LoginScreen';
import Loader from 'legacy-code/components/Shared/Loader';
import TopBar from 'legacy-code/components/Shared/TopBar/TopBar';
import { CHART_MIN_MAX } from 'legacy-code/constants/leaderboard';
import { routes } from 'legacy-code/constants/routes';
import { fetchChartsData, postChartsProcessing } from 'legacy-code/reducers/charts';
import { fetchPlayers } from 'legacy-code/reducers/players';
import { fetchResults, setFilter } from 'legacy-code/reducers/results';
import { fetchTracklist } from 'legacy-code/reducers/tracklist';
import { fetchUser } from 'legacy-code/reducers/user';
import { getItem, storageKeys } from 'legacy-code/utils/storage/versionedStorage';

const LazyAddResult = React.lazy(() => import('./Leaderboard/AddResult/AddResult'));
const LazyLeaderboard = React.lazy(() => import('./Leaderboard/Leaderboard'));
const LazyNewLeaderboards = React.lazy(() => import('../../features/leaderboards/Leaderboards'));
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

  // const resultsStore = useSelector(state => state.results);
  // console.log(resultsStore)

  useEffect(() => {
    if (!import.meta.env.VITE_SOCKET_MODE) {
      dispatch(fetchUser());
      getItem(storageKeys.filter)
        .then((filter) => {
          if (filter) {
            dispatch(
              setFilter({
                ..._.omit('song', filter),
                chartRange: filter.chartRange && {
                  ...filter.chartRange,
                  range: _.every(
                    (r) => r >= CHART_MIN_MAX[0] && r <= CHART_MIN_MAX[1],
                    filter.chartRange.range
                  )
                    ? filter.chartRange.range
                    : CHART_MIN_MAX,
                },
              })
            );
          }
        })
        .catch((error) => console.error('Cannot get filter from local storage', error));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!import.meta.env.VITE_SOCKET_MODE && userData && userData.player) {
      Promise.all([
        dispatch(fetchChartsData()),
        dispatch(fetchPlayers()),
        dispatch(fetchTracklist()),
      ]).then(() => {
        dispatch(postChartsProcessing());
      });
    }
  }, [dispatch, userData]);

  useEffect(() => {
    if (import.meta.env.VITE_SOCKET_MODE) {
      dispatch(fetchTracklist()).then(() => {
        dispatch(fetchResults());
      });
    }
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
          <Route path={routes.leaderboardOld.path} element={<LazyLeaderboard />} />
          <Route path={routes.leaderboard.sharedChart.path} element={<LazyLeaderboard />} />
          <Route path={routes.leaderboard.sharedChart.addResult.path} element={<LazyAddResult />} />
          <Route path={routes.ranking.path + '/*'} element={<LazyRanking />} />
          <Route path={routes.profile.path} element={<LazyProfile />} />
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
