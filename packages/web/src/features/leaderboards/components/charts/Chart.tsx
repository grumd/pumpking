import { ActionIcon, Text } from '@mantine/core';
import { useAtomValue } from 'jotai';
import _ from 'lodash/fp';
import { Fragment, memo, useState } from 'react';
import { FaGlobeAmericas } from 'react-icons/fa';

import { filterAtom } from 'features/leaderboards/hooks/useFilter';
import { useHighlightedPlayerIds } from 'features/leaderboards/hooks/useHighlightedPlayerIds';

import { useUser } from 'hooks/useUser';

import { useLanguage } from 'utils/context/translation';

import type { ChartApiOutput } from '../../hooks/useChartsQuery';
import { ChartHeader } from './ChartHeader/ChartHeader';
import Result from './Result';
import { ResultsCollapser } from './ResultsCollapser';

const Chart = memo(function _Chart({ chart }: { chart: ChartApiOutput }) {
  const currentPlayerId = useUser().data?.id;
  const filter = useAtomValue(filterAtom);
  const highlightedPlayerIds = useHighlightedPlayerIds();
  const [showHidden, setShowHidden] = useState(false);
  const lang = useLanguage();

  const hiddenResultsCount = chart.results.reduce((sum, res) => (res.isHidden ? sum + 1 : sum), 0);

  const results = chart.results
    .filter((res) => showHidden || !res.isHidden)
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

      let placeDifference = 0;
      if (res.scoreIncrease && isLatestScore) {
        const prevScore = res.score - res.scoreIncrease;
        const prevIndex = _.findLastIndex((res) => res.score > prevScore, array);
        placeDifference = prevIndex - index;
      }

      return {
        ...res,
        topPlace: index + 1,
        isImportant,
        highlightIndex,
        placeDifference,
        isLatestScore,
      };
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
      <ChartHeader chart={chart}>
        {hiddenResultsCount > 0 && (
          <>
            <Text size="xs" lh={1}>
              {lang.HIDDEN}: {hiddenResultsCount}
            </Text>
            <ActionIcon
              variant="subtle"
              aria-label="Show all"
              onClick={() => setShowHidden(!showHidden)}
            >
              <FaGlobeAmericas />
            </ActionIcon>
          </>
        )}
      </ChartHeader>
      <div className="charts">
        {!_.isEmpty(results) && (
          <div className="chart">
            <div className="results">
              <table>
                <tbody>
                  {resultGroups.map((group) => {
                    const groupResults = group.results.map((res) => {
                      return (
                        <Fragment key={res.id}>
                          <Result chart={chart} result={res} />
                        </Fragment>
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
});

export default Chart;
