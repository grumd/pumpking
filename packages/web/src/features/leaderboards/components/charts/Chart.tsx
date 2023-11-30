import { useAtomValue } from 'jotai';
import _ from 'lodash/fp';
import React, { useState } from 'react';

import { filterAtom } from 'features/leaderboards/hooks/useFilter';
import { useHighlightedPlayerIds } from 'features/leaderboards/hooks/useHighlightedPlayerIds';

import { useUser } from 'hooks/useUser';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import { ChartHeader } from './ChartHeader/ChartHeader';
import Result from './Result';
import { ResultsCollapser } from './ResultsCollapser';

const Chart = ({ chart }: { chart: ChartApiOutput }) => {
  const currentPlayerId = useUser().data?.id;
  const preferences = useUser().data?.preferences;
  const filter = useAtomValue(filterAtom);
  const highlightedPlayerIds = useHighlightedPlayerIds();

  const playersHiddenStatus = preferences?.playersHiddenStatus || {};
  const [isHidingPlayers, setHidingPlayers] = useState(true);

  let hiddenPlayersCount = 0;

  const results = chart.results
    .map((res, index, array) => {
      const isLatestScore = res.added === chart.updatedOn;
      const ppSortPlayerId =
        filter.sortChartsBy === 'pp' && !filter.sortChartsByPlayers?.length
          ? array[0].playerId
          : null;
      const highlightIndex = (
        ppSortPlayerId ? [ppSortPlayerId, ...highlightedPlayerIds] : highlightedPlayerIds
      ).indexOf(res.playerId ?? -1);

      const isImportant = isLatestScore || res.playerId === currentPlayerId || highlightIndex >= 0;

      const isPlayerHidden =
        !isImportant &&
        isHidingPlayers &&
        res.playerId != null &&
        (playersHiddenStatus[res.playerId] || false);

      let placeDifference = 0;
      if (res.scoreIncrease && isLatestScore) {
        const prevScore = res.score - res.scoreIncrease;
        const prevIndex = _.findLastIndex((res) => res.score > prevScore, array);
        placeDifference = prevIndex - index;
      }

      if (isPlayerHidden) {
        hiddenPlayersCount++;
      }

      return {
        ...res,
        topPlace: index + 1,
        isPlayerHidden,
        isImportant,
        highlightIndex,
        placeDifference,
        isLatestScore,
      };
    })
    .filter((res, index) => {
      return !(res.isPlayerHidden || (res.playerId === 1 && index !== 0));
    })
    .map((res, index, array) => {
      // Collapse results that are not within 2 places of a highlighted result
      const highlightRange = 2;
      const isBeforeHighlighted = array
        .slice(index + 1, index + 1 + highlightRange)
        .some((r) => r.isImportant);
      const isAfterHighlighted = array
        .slice(index - highlightRange, index)
        .some((r) => r.isImportant);
      return {
        ...res,
        isCollapsible: !res.isImportant && !isBeforeHighlighted && !isAfterHighlighted,
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
                      return (
                        <React.Fragment key={res.id}>
                          <Result chart={chart} result={res} />
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
