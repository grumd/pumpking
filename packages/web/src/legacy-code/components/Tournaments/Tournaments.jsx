import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash/fp';
import { useDispatch, useSelector } from 'react-redux';
import numeral from 'numeral';

import './tournaments.scss';

import { routes } from 'legacy-code/constants/routes';

import { fetchCurrentTournament } from 'legacy-code/reducers/tournament';

import Loader from 'legacy-code/components/Shared/Loader';
import { ChartLabel } from 'legacy-code/components/Leaderboard/ChartLabel';

import { labelToTypeLevel } from 'legacy-code/utils/leaderboards';

import { useLanguage } from 'legacy-code/utils/context/translation';

export default function Tournaments() {
  const lang = useLanguage();
  const dispatch = useDispatch();
  const [selectedBracket, setSelectedBracket] = useState(null);

  const tournData = useSelector((state) => state.tournament.data);
  const profiles = useSelector((state) => state.results.profiles);
  const isLoading = useSelector((state) => state.tournament.isLoading);
  const currentPlayerId = useSelector((state) => _.get('player.id', state.user.data));

  useEffect(() => {
    dispatch(fetchCurrentTournament());
  }, [dispatch]);

  useEffect(() => {
    if (currentPlayerId && !selectedBracket && _.get('brackets', tournData)) {
      const bracket = _.find((br) => {
        return br.playerIds.includes(currentPlayerId);
      }, tournData.brackets);
      bracket && setSelectedBracket(bracket);
    }
  }, [currentPlayerId, selectedBracket, tournData]);

  if (isLoading || _.isEmpty(profiles)) {
    return <Loader />;
  }

  const { tournament, brackets } = tournData;

  if (!tournament) {
    return null;
  }

  const date = new Date(tournament.start_date);
  const monthText = date.toLocaleString('default', {
    month: 'long',
  });
  const tournamentTitle = `${date.getFullYear()} ${monthText}`;

  return (
    <div className="tournaments-page">
      <header>{tournamentTitle}</header>
      <div className="description">
        <div className="labeled-item">
          <div className="title">{lang.START_DATE}</div>
          <div className="text">{new Date(tournament.start_date).toLocaleDateString()}</div>
        </div>
        <div className="labeled-item">
          <div className="title">{lang.END_DATE}</div>
          <div className="text">{new Date(tournament.end_date).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="brackets-title">{lang.BRACKETS}</div>
      <div className="brackets">
        {brackets.map((bracket) => {
          return (
            <div
              key={bracket.name}
              className={classNames('bracket', {
                active: bracket.name === _.get('name', selectedBracket),
              })}
              onClick={() => setSelectedBracket(bracket)}
            >
              <div className="bracket-name">{bracket.name}</div>
              {bracket.charts.map((chart) => {
                const [type, level] = labelToTypeLevel(chart.label);
                return (
                  <div className="chart" key={chart.sharedChartId}>
                    <ChartLabel type={type} level={level} /> {chart.trackName}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {selectedBracket && (
        <>
          <div className="results-title">{lang.RESULTS}</div>
          <div className="results">
            <table>
              <thead>
                <tr>
                  <th className="player-name">{lang.PLAYER}</th>
                  <th className="total">{lang.TOTAL}</th>
                  {selectedBracket.charts.map((chart) => {
                    const [type, level] = labelToTypeLevel(chart.label);
                    return (
                      <th colSpan={2} key={chart.sharedChartId}>
                        <div className="chart-header">
                          <ChartLabel type={type} level={level} />{' '}
                          <NavLink
                            exact
                            to={routes.leaderboard.sharedChart.getPath({
                              sharedChartId: chart.sharedChartId,
                            })}
                          >
                            {chart.trackName}
                          </NavLink>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const players = _.flow(
                    _.groupBy('player_id'),
                    _.mapValues(
                      _.flow(
                        _.map((result) => ({
                          ...result,
                          columnIndex: _.findIndex(
                            { sharedChartId: result.shared_chart },
                            selectedBracket.charts
                          ),
                        })),
                        _.groupBy('columnIndex')
                      )
                    )
                  )(selectedBracket.scores);
                  const charts = selectedBracket.charts.map((chart, index) => {
                    return {
                      ...chart,
                      maxScore: _.flow(
                        _.values,
                        _.flatMap(index),
                        _.maxBy('score'),
                        _.get('score')
                      )(players),
                    };
                  });

                  const playerData = _.mapValues(
                    _.flow(
                      _.toPairs,
                      _.map(([index, results]) => {
                        const maxScore = charts[index].maxScore;
                        const bestPlayerScore = _.flow(_.maxBy('score'), _.get('score'))(results);
                        const percent = ((bestPlayerScore / maxScore) * 100).toFixed(1);
                        return [
                          index,
                          {
                            playerName: results[0].player_name,
                            score: bestPlayerScore,
                            percent: percent,
                            percentRaw: bestPlayerScore / maxScore,
                          },
                        ];
                      }),
                      (chartResults) => {
                        const totalPercentRaw = _.sumBy('[1].percentRaw', chartResults);
                        return {
                          infoByIndex: _.fromPairs(chartResults),
                          totalPercentRaw,
                          totalPercent: (totalPercentRaw * 100).toFixed(1),
                        };
                      }
                    ),
                    players
                  );
                  const sortedIds = _.flow(
                    _.keys,
                    _.orderBy((id) => playerData[id].totalPercentRaw, ['desc'])
                  )(playerData);
                  const noResultsIds = _.remove(
                    (id) => sortedIds.includes(_.toString(id)) || !profiles[id],
                    selectedBracket.playerIds
                  );

                  return [...sortedIds, ...noResultsIds].map((playerId) => {
                    const data = playerData[playerId] || {};
                    const playerName = _.get('name', profiles[playerId]) || data.playerName;
                    return (
                      <tr key={playerId}>
                        <td className="player-name">{playerName}</td>
                        <td className="total">{data.totalPercent || 0}</td>
                        {selectedBracket.charts.map((chart, index) => {
                          const info = data.infoByIndex && data.infoByIndex[index];
                          return (
                            <React.Fragment key={index}>
                              <td>{info && `${info.percent}%`}</td>
                              <td>{info && numeral(info.score).format('0,0')}</td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
