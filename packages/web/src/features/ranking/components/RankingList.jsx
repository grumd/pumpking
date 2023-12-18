import classNames from 'classnames';
import _ from 'lodash/fp';
import { GiQueenCrown } from 'react-icons/gi';
import { NavLink } from 'react-router-dom';

import { usePreferencesMutation } from 'hooks/usePreferencesMutation';

import Flag from 'legacy-code/components/Shared/Flag';
import Loader from 'legacy-code/components/Shared/Loader';
import Toggle from 'legacy-code/components/Shared/Toggle/Toggle';
import { routes } from 'legacy-code/constants/routes';

import { useLanguage } from 'utils/context/translation';
import { api } from 'utils/trpc';

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
              {/* <th className="change"></th> */}
              {/* <th className="exp-rank">{lang.EXP}</th> */}
              <th className="name">{lang.NAME}</th>
              <th className="name name-piu">{lang.AMPASS}</th>
              {/*<th className="rating">{lang.ELO}</th>*/}
              <th className="rating">pp</th>
              {/* <th className="rating-change-cell"></th> */}
              {/* <th className="total-score">total score</th> */}
              {/* <th className="grades sss">
                <Grade grade="SSS" />
              </th>
              <th className="grades ss">
                <Grade grade="SS" />
              </th>
              <th className="grades s">
                <Grade grade="S" />
              </th>
              <th className="grades a">
                <Grade grade="A+" />
              </th>
              <th className="grades b">
                <Grade grade="B" />
              </th>
              <th className="grades c">
                <Grade grade="C" />
              </th>
              <th className="grades d">
                <Grade grade="D" />
              </th>
              <th className="grades f">
                <Grade grade="F" />
              </th> */}
              <th className="playcount">{lang.PLAYCOUNT}</th>
              <th className="playcount">{lang.SCORES_count}</th>
              {/* <th className="calories">kcal</th> */}
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

              // const ppDifference =
              //   (Math.floor(player.pp * 10) - Math.floor(player.prevRating * 10)) / 10 || 0;

              return (
                <tr className={classNames('player', { 'hidden-player': isHidden })} key={player.id}>
                  <td className="place">
                    {playerIndex === 0 ? <GiQueenCrown /> : `#${playerIndex + 1}`}
                  </td>
                  {/* <td className="change">
                    {player.change > 0 && (
                      <div className="change-holder up">
                        <span>{player.change}</span>
                        <FaAngleDoubleUp />
                      </div>
                    )}
                    {player.change < 0 && (
                      <div className="change-holder down">
                        <span>{-player.change}</span>
                        <FaAngleDoubleDown />
                      </div>
                    )}
                    {!!player.change && _.isString(player.change) && (
                      <div className="change-holder text">
                        <span>{player.change}</span>
                      </div>
                    )}
                  </td> */}
                  {/* <td className="exp-rank">{getRankImg(player.expRank)}</td> */}
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
                  {/*<td className="rating">{player.rating}</td>*/}
                  <td className="rating secondary">{Math.floor(player.pp)}</td>
                  {/* <td className="rating-change-cell">
                    {player.prevRating && ppDifference !== 0 && (
                      <span
                        className={classNames('rating-change', {
                          down: player.prevRating > player.pp,
                          up: player.prevRating < player.pp,
                        })}
                      >
                        {player.prevRating < player.pp ? '+' : ''}
                        {ppDifference.toFixed(1)}
                      </span>
                    )}
                  </td> */}
                  {/* <td className="grades sss">{player.grades.SSS}</td>
                  <td className="grades ss">{player.grades.SS}</td>
                  <td className="grades s">{player.grades.S}</td>
                  <td className="grades a">{player.grades.A}</td>
                  <td className="grades b">{player.grades.B}</td>
                  <td className="grades c">{player.grades.C}</td>
                  <td className="grades d">{player.grades.D}</td>
                  <td className="grades f">{player.grades.F}</td> */}
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
