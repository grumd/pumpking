import classNames from 'classnames';
import _ from 'lodash/fp';
import queryString from 'query-string';
import React, { useEffect, useState } from 'react';
import { FaGlobeAmericas, FaYoutube } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import { useUser } from 'hooks/useUser';

import { routes } from 'legacy-code/constants/routes';
import { labelToTypeLevel } from 'legacy-code/utils/leaderboards';

import { useLanguage } from 'utils/context/translation';

import type { ChartApiOutput } from '../hooks/useChartsQuery';
import { ChartLabel } from './ChartLabel';
import Result from './Result';
import { ResultsCollapser } from './ResultsCollapser';

const Chart = ({
  chart,
  playersHiddenStatus: propPlayersHiddenStatus,
  showHiddenPlayers = false,
  showProtagonistPpChange = false,
  uniqueSelectedNames = [],
  protagonistName = null,
}: {
  chart: ChartApiOutput;
  playersHiddenStatus?: Record<string, boolean>;
  showHiddenPlayers?: boolean;
  showProtagonistPpChange?: boolean;
  uniqueSelectedNames?: string[];
  protagonistName?: string | null;
}) => {
  const currentPlayerId = useUser().data?.id;
  const preferences = useUser().data?.preferences;

  const playersHiddenStatus = propPlayersHiddenStatus || preferences?.playersHiddenStatus || {};
  const [isHidingPlayers, setHidingPlayers] = useState(!showHiddenPlayers);

  const lang = useLanguage();

  useEffect(() => {
    setHidingPlayers(!showHiddenPlayers);
  }, [showHiddenPlayers]);

  let topPlace = 1;
  const occuredplayerNames: string[] = [];
  let hiddenPlayersCount = 0;
  const results = chart.results
    .map((res, index, array) => {
      const isProtagonist = res.playerName === protagonistName;
      const isPlayerHidden =
        !isProtagonist &&
        isHidingPlayers &&
        res.playerId != null &&
        (playersHiddenStatus[res.playerId] || false);
      const isSecondOccurenceInResults = occuredplayerNames.includes(res.playerName);
      occuredplayerNames.push(res.playerName);

      let placeDifference = 0;
      if (res.scoreIncrease && res.added === chart.updatedOn) {
        const prevScore = res.score - res.scoreIncrease;
        const newIndex = _.findLastIndex((res) => res.score > prevScore, array);
        placeDifference = newIndex - index;
      }

      if (index === 0) {
        topPlace = 1;
      } else if (!isSecondOccurenceInResults && res.score !== _.get([index - 1, 'score'], array)) {
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
        highlightIndex: uniqueSelectedNames.indexOf(res.playerName),
        isProtagonist: res.playerName === protagonistName,
        placeDifference,
        isLatestScore: res.added === chart.updatedOn,
      };
    })
    .filter((res, index) => {
      return !(res.isPlayerHidden || (res.id === 1 && index !== 0));
    })
    .map((res, index, array) => {
      // Collapse results that are not within 2 places of a highlighted result
      const isResultImportant = (r: typeof res) =>
        r.playerId === currentPlayerId || r.isLatestScore || r.highlightIndex > -1;
      const highlightRange = 2;
      const isHighlighted = isResultImportant(res);
      const isBeforeHighlighted = array
        .slice(index + 1, index + 1 + highlightRange)
        .some(isResultImportant);
      const isAfterHighlighted = array.slice(index - highlightRange, index).some(isResultImportant);
      return {
        ...res,
        isCollapsible: !isHighlighted && !isBeforeHighlighted && !isAfterHighlighted,
      };
    });

  const resultGroups = results.reduce(
    (acc: { results: typeof results; isGroupCollapsible: boolean }[], res) => {
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
    },
    []
  );

  const [chartType] = labelToTypeLevel(chart.label);

  // TODO: remove check from sharedCharts when SocketTracker works off results data instead of topPerSong

  return (
    <div className="song-block">
      <div className="song-name">
        <ChartLabel type={chartType} level={chart.level ?? '?'} />
        <div className="song-name-text">
          <NavLink to={routes.leaderboard.sharedChart.getPath({ sharedChartId: chart.id })}>
            {chart.songName}
          </NavLink>{' '}
          <span className="_grey-text">
            {chart.difficulty ? `(${chart.difficulty.toFixed(1)}) ` : ''}
          </span>
        </div>
        <div className="youtube-link">
          <a
            href={`https://youtube.com/results?${queryString.stringify({
              search_query: `${chart.songName} ${chart.label}`.replace(/( -)|(- )/g, ' '),
            })}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaYoutube />
          </a>
        </div>
        <div className="_flex-fill" />
        <div className="right-side-block">
          {hiddenPlayersCount > 0 && (
            <div className={classNames('players-hidden-count _grey-text _on-hover')}>
              {lang.HIDDEN}: {hiddenPlayersCount}
            </div>
          )}
          {(hiddenPlayersCount > 0 || !isHidingPlayers) && (
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
                        <React.Fragment key={res.id}>
                          <Result
                            chart={chart}
                            result={res}
                            placeDifference={res.placeDifference}
                            showPpChange={showPpChange}
                            highlightIndex={res.highlightIndex}
                            // leftProfile={leftProfile}
                            // rightProfile={rightProfile}
                            // isSocketView={isSocketView}
                            // notBestGradeResult={!!res.bestGradeResult}
                          />
                          {/* {res.bestGradeResult && (
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
                          )} */}
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
};
export default Chart;
