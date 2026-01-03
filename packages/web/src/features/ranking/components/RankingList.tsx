import type { ApiOutputs } from '@/api/trpc/router';
import { Flex, Switch } from '@mantine/core';
import classNames from 'classnames';
import _ from 'lodash/fp';
import { GiQueenCrown } from 'react-icons/gi';
import { NavLink } from 'react-router-dom';

import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';
import { Flag } from 'components/Flag/Flag';
import Loader from 'components/Loader/Loader';

import { routes } from 'constants/routes';

import { usePreferencesMutation } from 'hooks/usePreferencesMutation';

import { useLanguage } from 'utils/context/translation';

type PlayerStats = ApiOutputs['players']['stats'][number];
type UserData = ApiOutputs['user']['current'];
type Preferences = NonNullable<UserData>['preferences'];

interface RankingListProps {
  ranking: PlayerStats[] | undefined;
  isLoading: boolean;
  preferences: Preferences | undefined;
}

export default function RankingList({ ranking, isLoading, preferences }: RankingListProps) {
  const lang = useLanguage();
  const preferencesMutation = usePreferencesMutation();

  return (
    <div className="ranking-list">
      {_.isEmpty(ranking) && !isLoading && 'ничего не найдено'}
      {isLoading && <Loader />}
      {!isLoading && ranking && (
        <table>
          <thead>
            <tr>
              <th className="place">{lang.RANK}</th>
              <th>{lang.EXP}</th>
              <th className="name">{lang.NAME}</th>
              <th className="name name-piu">{lang.AMPASS}</th>
              <th className="rating">pp</th>
              <th className="playcount">{lang.PLAYCOUNT}</th>
              <th className="playcount">{lang.SCORES_count}</th>
              <th className="accuracy">{lang.ACCURACY}</th>
              <th className="hide-col"> </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((player, playerIndex) => {
              const isHidden = preferences?.playersHiddenStatus?.[player.id];
              if (isHidden && !preferences?.showHiddenPlayersInRanking) {
                return null;
              }

              return (
                <tr className={classNames('player', { 'hidden-player': isHidden })} key={player.id}>
                  <td className="place">
                    {playerIndex === 0 ? <GiQueenCrown /> : `#${playerIndex + 1}`}
                  </td>
                  <td>{player.exp != null ? <ExpRankImg exp={player.exp} /> : null}</td>
                  <td className="name">
                    <Flex gap="xxs" align="center">
                      {player.region ? <Flag region={player.region} /> : null}
                      <NavLink to={routes.profile.getPath({ id: player.id })}>
                        {player.nickname}
                      </NavLink>
                    </Flex>
                  </td>
                  <td className="name name-piu">
                    <NavLink to={routes.profile.getPath({ id: player.id })}>
                      {player.arcade_name}
                    </NavLink>
                  </td>
                  <td className="rating secondary">
                    {player.pp != null ? Math.floor(player.pp) : ''}
                  </td>
                  <td className="playcount">{player.results_count}</td>
                  <td className="playcount">{player.best_results_count}</td>
                  <td className="accuracy">
                    {player.accuracy ? `${player.accuracy.toFixed(2)}%` : ''}
                  </td>
                  <td className="hide-col">
                    <Switch
                      withThumbIndicator={false}
                      color="dark"
                      onChange={() => {
                        if (preferences) {
                          preferencesMutation.mutate(
                            _.set(['playersHiddenStatus', player.id], !isHidden, preferences)
                          );
                        }
                      }}
                      checked={!isHidden}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
