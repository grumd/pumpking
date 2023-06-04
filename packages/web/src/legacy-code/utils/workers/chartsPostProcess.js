import * as Comlink from 'comlink';
import _ from 'lodash/fp';
import {
  getMaxRawScore,
  getProfileInfoFromResult,
  gradeComparator,
  initializeProfile,
  labelToTypeLevel,
  mapResult,
} from '../leaderboards';
import { parseDate } from '../date';

export const processChartsData = (chartsData, players) => {
  // let a0, a1, b0, b1, bSum, c0, c1;
  // a0 = performance.now();
  // bSum = 0;

  //// Initialization
  // Init for TOP
  const getTopResultId = (result) => `${result.sharedChartId}-${result.playerId}-${result.isRank}`;
  const getBestGradeResultId = (result) => `${result.sharedChartId}-${result.playerId}`;
  const top = {}; // Main top scores pbject

  // Profiles for every player
  let profiles = {};

  // Loop 1
  for (let sharedChartId in chartsData) {
    const chartEntry = chartsData[sharedChartId];

    // Initialize chart info
    const chartInfo = chartEntry.chart;
    const label = _.toUpper(chartInfo.chart_label);
    const [chartType, chartLevel] = labelToTypeLevel(label);

    top[sharedChartId] = {
      song: chartInfo.track_name,
      chartLabel: label,
      chartLevel,
      chartType,
      duration: chartInfo.duration,
      sharedChartId: sharedChartId,
      maxTotalSteps: chartInfo.max_total_steps,
      results: [],
      previousResults: [],
      eachResultPlayerIds: [],
      latestScoreDate: _.last(chartEntry.results)?.gained,
      latestAddedScoreDate: _.last(chartEntry.results)?.added,
      maxScore: null,
      difficulty: chartInfo.difficulty,
    };

    // Parsing results
    const topResults = {};
    const bestGradeResults = {};

    const chartList = [...chartEntry.results, ...(chartEntry.bestGradeResults || [])];
    chartList.sort(
      (a, b) => a.score - b.score || parseDate(a.gained).getTime() - parseDate(b.gained).getTime()
    );

    // scores should be sorted from lowest to highest
    _.forEachRight((_result) => {
      if (!players[_result.player]) {
        // Player of this result was not found in list of players. Ignoring this result like it doesn't exist
        return;
      }

      const chartTop = top[sharedChartId];
      const result = mapResult(_result, players, chartTop, sharedChartId);
      const topResultId = getTopResultId(result);
      const bestGradeResultId = getBestGradeResultId(result);

      // Recording player ids just to calculate total number of results made on this chart (and be able to filter out hidden players)
      chartTop.eachResultPlayerIds.push(result.id);

      // Recording best grade for every player on every chart
      if (
        !bestGradeResults[bestGradeResultId] ||
        gradeComparator[bestGradeResults[bestGradeResultId].grade] < gradeComparator[result.grade]
      ) {
        if (bestGradeResults[bestGradeResultId]) {
          bestGradeResults[bestGradeResultId].isBestGradeOnChart = false;
        }
        result.isBestGradeOnChart = true;
        bestGradeResults[bestGradeResultId] = result;
      }

      // Splitting all results into best results and previous results
      if (!topResults[topResultId]) {
        const newScoreIndex = _.sortedIndexBy((r) => -r.score, result, chartTop.results);
        // Sorted from higher score to lower score
        chartTop.results.splice(newScoreIndex, 0, result);
        topResults[topResultId] = result;

        // Additional info that can be derived from best results:
        if (!result.isRank) {
          if (result.accuracy) {
            const maxScoreCandidate = getMaxRawScore(result);
            if (chartTop.maxScore < maxScoreCandidate) {
              chartTop.maxScore = maxScoreCandidate;
            }
          } else if (chartTop.maxScore && chartTop.maxScore < result.score) {
            chartTop.maxScore = result.score;
          }
        }
        if (!result.isUnknownPlayer && !result.isIntermediateResult) {
          if (!profiles[result.playerId]) {
            initializeProfile(result, profiles, players);
          }
          getProfileInfoFromResult(result, chartTop, profiles);
        }
      } else {
        result.isIntermediateResult = true;
        // Sorted from latest to oldest
        chartTop.previousResults.push(result);
      }

      const sameMode =
        (result.isRank && topResults[topResultId].isRank) ||
        (!result.isRank && !topResults[topResultId].isRank);

      if (result.isBestGradeOnChart && topResults[topResultId].id !== result.id && sameMode) {
        topResults[topResultId].bestGradeResult = result;
      }
    }, chartList);
  }

  // a1 = performance.now();
  // console.log('Perf data:', a1 - a0, bSum, c1 - c0);
  return { profiles, sharedCharts: top };
};

Comlink.expose(processChartsData);
