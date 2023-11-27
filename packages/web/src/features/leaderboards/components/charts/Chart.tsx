import _ from 'lodash/fp';
import React, { useEffect, useState } from 'react';

import { useUser } from 'hooks/useUser';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import { ChartHeader } from './ChartHeader/ChartHeader';
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

  // TODO: remove check from sharedCharts when SocketTracker works off results data instead of topPerSong

  return (
    <div className="song-block">
      <ChartHeader chart={chart} />
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
                          />
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
