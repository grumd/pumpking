import { Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import _ from 'lodash/fp';
import { FaQuestionCircle, FaSearch } from 'react-icons/fa';
import { Link, Route, Routes } from 'react-router-dom';

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
  } = useQuery(api.players.stats.queryOptions());

  const preferencesMutation = usePreferencesMutation();
  const preferences = userQuery.data?.preferences;

  const onChangeHidingPlayers = () => {
    if (preferences) {
      preferencesMutation.mutate(
        _.set(['showHiddenPlayersInRanking'], !preferences.showHiddenPlayersInRanking, preferences)
      );
    }
  };

  const onRefresh = () => {
    if (!isLoading) {
      refetchRanking();
    }
  };

  return (
    <div className="ranking-page">
      <div className="content">
        {error && error.message}
        <div className="top-controls">
          <Routes>
            <Route
              index
              element={
                <>
                  <Button size="sm" mr="xs" disabled={!preferences} onClick={onChangeHidingPlayers}>
                    {preferences?.showHiddenPlayersInRanking ? lang.HIDE_UNSELECTED : lang.SHOW_ALL}
                  </Button>
                  <Button
                    component={Link}
                    to="faq"
                    size="sm"
                    mr="xs"
                    leftSection={<FaQuestionCircle />}
                  >
                    faq
                  </Button>
                  <Button
                    size="sm"
                    disabled={isFetching}
                    onClick={onRefresh}
                    leftSection={<FaSearch />}
                  >
                    {lang.UPDATE}
                  </Button>
                </>
              }
            />
            <Route
              path="faq"
              element={
                <Button component={Link} to=".." size="sm" variant="filled" color="dark">
                  {lang.BACK_BUTTON}
                </Button>
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
