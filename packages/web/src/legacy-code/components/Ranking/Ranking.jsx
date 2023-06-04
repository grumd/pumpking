import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaSearch, FaQuestionCircle } from 'react-icons/fa';
import { Link, Route, Routes } from 'react-router-dom';
import { createSelector } from 'reselect';
import _ from 'lodash/fp';

// styles
import './ranking.scss';

// components
import RankingList from './RankingList';
import RankingFaq from './RankingFaq';

// reducers
import { fetchChartsData } from 'legacy-code/reducers/charts';
import { updatePreferences } from 'legacy-code/reducers/preferences';

// utils
import { useLanguage } from 'legacy-code/utils/context/translation';

// code
const rankingSelector = createSelector(
  (state) => state.results.profiles,
  _.flow(_.values, _.orderBy('pp', ['desc']))
);

const Ranking = () => {
  const dispatch = useDispatch();
  const lang = useLanguage();
  const isLoading = useSelector(
    (state) => state.charts.isLoading || state.results.isLoadingRanking || state.tracklist.isLoading
  );
  const error = useSelector((state) => state.charts.error || state.tracklist.error);
  const ranking = useSelector(rankingSelector);
  const preferences = useSelector((state) => state.preferences.data);

  const onChangeHidingPlayers = () => {
    dispatch(
      updatePreferences(
        _.set(['showHiddenPlayersInRanking'], !preferences.showHiddenPlayersInRanking, preferences)
      )
    );
  };

  const onRefresh = () => {
    !isLoading && dispatch(fetchChartsData());
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
                    onClick={onChangeHidingPlayers}
                  >
                    {preferences.showHiddenPlayersInRanking ? lang.HIDE_UNSELECTED : lang.SHOW_ALL}
                  </button>
                  <Link to="faq">
                    <button className="btn btn-sm btn-dark btn-icon _margin-right">
                      <FaQuestionCircle /> faq
                    </button>
                  </Link>
                  <button
                    disabled={isLoading}
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
