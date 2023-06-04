import React, { useState, useEffect, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import _ from 'lodash/fp';
import { FaYoutube, FaGlobeAmericas } from 'react-icons/fa';
import classNames from 'classnames';
import queryString from 'query-string';

import { routes } from 'legacy-code/constants/routes';

import Result from './Result';
import { ChartLabel } from './ChartLabel';
import { ResultsCollapser } from './ResultsCollapser';

import { useLanguage } from 'legacy-code/utils/context/translation';
import { FilteredDataContext } from '../Contexts/FilteredDataContext';

const Chart = React.forwardRef(
  (
    {
      playersHiddenStatus: propPlayersHiddenStatus,
      showHiddenPlayers = false,
      showProtagonistPpChange = false,
      uniqueSelectedNames = [],
      protagonistName = null,
      // socket stuff
      leftProfile = {},
      rightProfile = {},
      isSocketView = false,
      chartIndex,
      chart: forcedChart,
    },
    ref
  ) => {
    const currentPlayerId = useSelector((state) => state.user.data?.player?.id);
    const statePlayersHiddenStatus = useSelector(
      (state) => state.preferences.data.playersHiddenStatus
    );
    const playersHiddenStatus = propPlayersHiddenStatus || statePlayersHiddenStatus || {};

    const filteredData = useContext(FilteredDataContext);
    const chart = forcedChart || filteredData[chartIndex];
    const [isHidingPlayers, setHidingPlayers] = useState(!showHiddenPlayers);

    const lang = useLanguage();

    useEffect(() => {
      setHidingPlayers(!showHiddenPlayers);
    }, [showHiddenPlayers]);

    let topPlace = 1;
    const occuredNicknames = [];
    let hiddenPlayersCount = 0;
    const results = chart.results
      .map((res, index, array) => {
        const isProtagonist = res.nickname === protagonistName;
        const isPlayerHidden =
          !isProtagonist && isHidingPlayers && (playersHiddenStatus[res.playerId] || false);
        const isSecondOccurenceInResults = occuredNicknames.includes(res.nickname);
        occuredNicknames.push(res.nickname);

        let placeDifference = 0;
        if (res.scoreIncrease && res.dateAdded === chart.latestAddedScoreDate) {
          const prevScore = res.score - res.scoreIncrease;
          const newIndex = _.findLastIndex((res) => res.score > prevScore, array);
          placeDifference = newIndex - index;
        }

        if (index === 0) {
          topPlace = 1;
        } else if (
          !isSecondOccurenceInResults &&
          res.score !== _.get([index - 1, 'score'], array)
        ) {
          topPlace += 1;
        }

        if (isPlayerHidden) {
          hiddenPlayersCount++;
        }

        return {
          ...res,
          topPlace,
          isSecondOccurenceInResults,
          isPlayerHidden,
          highlightIndex: uniqueSelectedNames.indexOf(res.nickname),
          isProtagonist: res.nickname === protagonistName,
          placeDifference,
          isLatestScore: res.dateAdded === chart.latestAddedScoreDate,
        };
      })
      .filter((res, index) => {
        return !(res.isPlayerHidden || (res.isUnknownPlayer && index !== 0));
      })
      .map((res, index, array) => {
        // Collapse results that are not within 2 places of a highlighted result
        const isResultImportant = (r) =>
          r.playerId === currentPlayerId || r.isLatestScore || r.highlightIndex > -1;
        const highlightRange = 2;
        const isHighlighted = isResultImportant(res);
        const isBeforeHighlighted = array
          .slice(index + 1, index + 1 + highlightRange)
          .some(isResultImportant);
        const isAfterHighlighted = array
          .slice(index - highlightRange, index)
          .some(isResultImportant);
        return {
          ...res,
          isCollapsible: !isHighlighted && !isBeforeHighlighted && !isAfterHighlighted,
        };
      });

    const resultGroups = results.reduce((acc, res) => {
      if (!acc.length) {
        acc.push({
          isGroupCollapsible: res.isCollapsible,
          results: [res],
        });
      } else if (acc[acc.length - 1].isGroupCollapsible !== res.isCollapsible) {
        acc.push({
          isGroupCollapsible: res.isCollapsible,
          results: [res],
        });
      } else {
        acc[acc.length - 1].results.push(res);
      }
      return acc;
    }, []);

    // TODO: remove check from sharedCharts when SocketTracker works off results data instead of topPerSong

    return (
      <div className="song-block" ref={ref}>
        <div className="song-name">
          <ChartLabel type={chart.chartType} level={chart.chartLevel} />
          {isSocketView ? (
            <div className="song-name-text">
              {chart.difficulty ? `(${chart.difficulty.toFixed(1)}) ` : ''}
              {chart.song}
            </div>
          ) : (
            <div className="song-name-text">
              <NavLink
                exact
                to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.sharedChartId })}
              >
                {chart.song}
              </NavLink>{' '}
              <span className="_grey-text">
                {chart.difficulty ? `(${chart.difficulty.toFixed(1)}) ` : ''}
              </span>
            </div>
          )}
          {!isSocketView && (
            <div className="youtube-link">
              <a
                href={`https://youtube.com/results?${queryString.stringify({
                  search_query: `${chart.song} ${chart.chartLabel}`.replace(/( -)|(- )/g, ' '),
                })}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaYoutube />
              </a>
            </div>
          )}
          <div className="_flex-fill" />
          <div className="right-side-block">
            {hiddenPlayersCount > 0 && (
              <div
                className={classNames('players-hidden-count _grey-text', {
                  '_on-hover': !isSocketView,
                })}
              >
                {lang.HIDDEN}: {hiddenPlayersCount}
              </div>
            )}
            {(hiddenPlayersCount > 0 || !isHidingPlayers) && !isSocketView && (
              <div
                className="globe-icon _on-hover"
                onClick={() => setHidingPlayers(!isHidingPlayers)}
              >
                <FaGlobeAmericas />
              </div>
            )}
          </div>
        </div>
        <div className="charts">
          {!_.isEmpty(results) && (
            <div className="chart">
              <div className="results">
                <table>
                  <tbody>
                    {resultGroups.map((group) => {
                      const groupResults = group.results.map((res) => {
                        const showPpChange = res.isProtagonist && showProtagonistPpChange;
                        return (
                          <React.Fragment key={res.isRank + '_' + res.nickname}>
                            <Result
                              chart={chart}
                              res={res}
                              placeDifference={res.placeDifference}
                              showPpChange={showPpChange}
                              highlightIndex={res.highlightIndex}
                              leftProfile={leftProfile}
                              rightProfile={rightProfile}
                              isSocketView={isSocketView}
                              notBestGradeResult={!!res.bestGradeResult}
                            />
                            {res.bestGradeResult && (
                              <Result
                                chart={chart}
                                res={res.bestGradeResult}
                                placeDifference={res.placeDifference}
                                showPpChange={showPpChange}
                                highlightIndex={res.highlightIndex}
                                leftProfile={leftProfile}
                                rightProfile={rightProfile}
                                isSocketView={isSocketView}
                                bestGradeScore={true}
                              />
                            )}
                          </React.Fragment>
                        );
                      });
                      if (group.isGroupCollapsible) {
                        return (
                          <ResultsCollapser count={groupResults.length}>
                            {groupResults}
                          </ResultsCollapser>
                        );
                      } else {
                        return <>{groupResults}</>;
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default Chart;
