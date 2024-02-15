import classNames from 'classnames';
import _ from 'lodash/fp';
import { GiQueenCrown } from 'react-icons/gi';
import { NavLink } from 'react-router-dom';

import { ExpRankImg } from 'components/ExpRankImg/ExpRankImg';

import { usePreferencesMutation } from 'hooks/usePreferencesMutation';

import Flag from 'legacy-code/components/Shared/Flag';
import Loader from 'legacy-code/components/Shared/Loader';
import Toggle from 'legacy-code/components/Shared/Toggle/Toggle';
import { routes } from 'legacy-code/constants/routes';

import { useLanguage } from 'utils/context/translation';

export default function RankingList({ ranking, isLoading, preferences }) {
  const lang = useLanguage();
  const preferencesMutation = usePreferencesMutation();

  // TODO: rewrite in TS

  return (
    <div className="ranking-list">
      {_.isEmpty(ranking) && !isLoading && 'ничего не найдено'}
      {isLoading && <Loader />}
      {!isLoading && (
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
              const isHidden = preferences?.playersHiddenStatus[player.id];
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
                    <div className="name-container">
                      <Flag region={player.region} />
                      <NavLink exact to={routes.profile.getPath({ id: player.id })}>
                        {player.nickname}
                      </NavLink>
                    </div>
                  </td>
                  <td className="name name-piu">
                    <NavLink exact to={routes.profile.getPath({ id: player.id })}>
                      {player.arcade_name}
                    </NavLink>
                  </td>
                  <td className="rating secondary">{Math.floor(player.pp)}</td>
                  <td className="playcount">{player.results_count}</td>
                  <td className="playcount">{player.best_results_count}</td>
                  <td className="accuracy">
                    {player.accuracy ? `${player.accuracy.toFixed(2)}%` : ''}
                  </td>
                  <td className="hide-col">
                    <Toggle
                      onChange={() => {
                        preferencesMutation.mutate(
                          _.set(['playersHiddenStatus', player.id], !isHidden, preferences)
                        );
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
