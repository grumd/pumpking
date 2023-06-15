import _ from 'lodash/fp';
import type { Dictionary } from 'lodash';
import { Grade, gradeSortValue } from 'constants/grades';

/**
 * Group results by chart
 */
export const getGroupedBestResults = <
  ArgItem extends {
    shared_chart: { id: number };
    player: { id: number };
  }
>(
  allResults: ArgItem[]
): Dictionary<ArgItem[]> => {
  const resultsByChart = _.flow<[ArgItem[]], Dictionary<ArgItem[]>, Dictionary<ArgItem[]>>(
    _.groupBy((result) => result.shared_chart.id),
    _.mapValues((results) => {
      const hasPlayerScore: Record<number, boolean> = {};
      // Remove results that are not best player's result on chart
      return _.filter((res) => {
        if (hasPlayerScore[res.player.id]) {
          return false;
        } else {
          hasPlayerScore[res.player.id] = true;
          return true;
        }
      }, results);
    })
  )(allResults);

  return resultsByChart;
};

export const getAccuracyPercent = (r: {
  perfects: number | null;
  greats: number | null;
  goods: number | null;
  bads: number | null;
  misses: number | null;
}): number | null => {
  return !_.isNil(r.perfects) &&
    !_.isNil(r.greats) &&
    !_.isNil(r.goods) &&
    !_.isNil(r.bads) &&
    !_.isNil(r.misses)
    ? Math.floor(
        ((r.perfects * 100 + r.greats * 85 + r.goods * 60 + r.bads * 20 + r.misses * -25) /
          (r.perfects + r.greats + r.goods + r.bads + r.misses)) *
          100
      ) / 100
    : null;
};

export const getMaxScoreCandidate = (
  scoreRaw: number,
  accuracy: number | null,
  isRank: boolean
): number => {
  return ((scoreRaw / (accuracy ?? 100)) * 100) / (isRank ? 1.2 : 1);
};

export const getScoreWithoutBonus = (score: number, grade: Grade): number => {
  if (grade === Grade.SSS) return score - 300000;
  if (grade === Grade.SS) return score - 150000;
  if (grade === Grade.S) return score - 100000;
  return score;
};

export interface ResultRow {
  id: number;
  shared_chart_id: number;
  player_id: number;
}

export const getChartBestResults = (allResults: ResultRow[]): Dictionary<ResultRow[]> => {
  const resultsByChart = _.flow<[ResultRow[]], Dictionary<ResultRow[]>, Dictionary<ResultRow[]>>(
    _.groupBy((result) => result.shared_chart_id),
    _.mapValues((results) => {
      // const logged = results[0].shared_chart_id == 2817;
      // logged && console.log(results);
      const hasPlayerScore: Record<number, boolean> = {};
      // Remove results that are not best player's result on chart
      const filtered = _.filter((res) => {
        if (hasPlayerScore[res.player_id]) {
          return false;
        } else {
          hasPlayerScore[res.player_id] = true;
          return true;
        }
      }, results);
      // logged && console.log(filtered);
      return filtered;
    })
  )(allResults);

  return resultsByChart;
};

export interface ResultGradeRow {
  id: number;
  shared_chart_id: number;
  player_id: number;
  grade: Grade;
}

export const getChartBestGrades = (allResults: ResultGradeRow[]): Dictionary<ResultGradeRow[]> => {
  const resultsByChart = _.flow<
    [ResultGradeRow[]],
    Dictionary<ResultGradeRow[]>,
    Dictionary<ResultGradeRow[]>
  >(
    _.groupBy((result) => result.shared_chart_id),
    _.mapValues((results) => {
      // const logged = results[0].shared_chart_id == 41;
      // logged && console.log(results);
      const sortedResults = results.sort(
        (a, b) => gradeSortValue[b.grade] - gradeSortValue[a.grade]
      );
      // logged && console.log(sortedResults);
      const hasPlayerResult: Record<number, boolean> = {};
      // Remove results that are not best player's result on chart
      const filtered = _.filter((res) => {
        if (hasPlayerResult[res.player_id]) {
          return false;
        } else {
          hasPlayerResult[res.player_id] = true;
          return true;
        }
      }, sortedResults);
      // logged && console.log(filtered);
      return filtered;
    })
  )(allResults);

  return resultsByChart;
};
