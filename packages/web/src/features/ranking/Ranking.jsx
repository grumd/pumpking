import _ from 'lodash/fp';
import { FaQuestionCircle, FaSearch } from 'react-icons/fa';
import { Link, Route, Routes } from 'react-router-dom';

// styles
import './ranking.scss';

import { usePreferencesMutation } from 'hooks/usePreferencesMutation';
import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

import RankingFaq from './components/RankingFaq';
import RankingList from './components/RankingList';

const Ranking = () => {
  const lang = useLanguage();
  const userQuery = useUser();
  const {
    isLoading,
    isFetching,
    error,
    data: ranking,
    refetch: refetchRanking,
  } = api.players.stats.useQuery();

  const preferencesMutation = usePreferencesMutation();
  const preferences = userQuery.data?.preferences;

  const onChangeHidingPlayers = () => {
    preferencesMutation.mutate(
      _.set(['showHiddenPlayersInRanking'], !preferences.showHiddenPlayersInRanking, preferences)
    );
  };

  const onRefresh = () => {
    !isLoading && refetchRanking();
  };

  return (
    <div className="ranking-page">
      <div className="content">
        {error && error.message}
        <div className="top-controls">
          <div className="_flex-fill" />
          <Routes>
            <Route
              index
              element={
                <>
                  <button
                    className="btn btn-sm btn-dark btn-icon _margin-right"
                    disabled={!preferences}
                    onClick={onChangeHidingPlayers}
                  >
                    {preferences?.showHiddenPlayersInRanking ? lang.HIDE_UNSELECTED : lang.SHOW_ALL}
                  </button>
                  <Link to="faq">
                    <button className="btn btn-sm btn-dark btn-icon _margin-right">
                      <FaQuestionCircle /> faq
                    </button>
                  </Link>
                  <button
                    disabled={isFetching}
                    className="btn btn-sm btn-dark btn-icon"
                    onClick={onRefresh}
                  >
                    <FaSearch /> {lang.UPDATE}
                  </button>
                </>
              }
            />
            <Route
              path="faq"
              element={
                <Link to="..">
                  <button className="btn btn-sm btn-dark btn-icon">назад</button>
                </Link>
              }
            />
          </Routes>
        </div>
        <Routes>
          <Route
            index
            element={
              <RankingList ranking={ranking} isLoading={isLoading} preferences={preferences} />
            }
          />
          <Route path="faq" element={<RankingFaq />} />
        </Routes>
      </div>
    </div>
  );
};

export default Ranking;
