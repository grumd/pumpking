import _ from 'lodash/fp';

import { db, type Transaction } from 'db';

import { mix } from 'constants/currentMix';
import { isValidGrade } from 'constants/grades';

import { getAccuracyPercent, getMaxScoreCandidate, getScoreWithoutBonus } from 'utils/results';

export const calculateResultsPp = async (sharedChartId?: number | null, trx?: Transaction) => {
  let query = (trx || db)
    .selectFrom('results_highest_score_no_rank as best')
    .innerJoin('results', 'results.id', 'best.result_id')
    .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
    .innerJoin('players', 'players.id', 'best.player_id')
    .select([
      'results.id',
      'results.score_xx',
      'results.grade',
      'results.perfects',
      'results.greats',
      'results.goods',
      'results.bads',
      'results.misses',
      'results.shared_chart',
      'best.player_id',
      'chart_instances.level',
      'chart_instances.interpolated_difficulty',
    ])
    .where('players.hidden', '=', 0)
    .where('results.rank_mode', '=', 0) // probably not needed because using ResultHighestScoreNoRank
    .where('results.mix', '=', mix)
    .where('results.chart_label', 'not like', 'COOP%')
    .orderBy('results.gained', 'desc');

  if (sharedChartId) {
    query = query.where('shared_chart_id', '=', sharedChartId);
  }

  const allBestResults = await query.execute();

  const sharedCharts = _.groupBy((res) => res.shared_chart, allBestResults);

  const resultPpMap = new Map<number, number | null>();

  for (const chartId in sharedCharts) {
    const results = sharedCharts[chartId].map((res) => {
      const accuracy = getAccuracyPercent(res);
      const scoreRaw =
        res.score_xx && isValidGrade(res.grade)
          ? getScoreWithoutBonus(res.score_xx, res.grade)
          : null;
      return {
        ...res,
        scoreRaw,
        accuracy,
        maxScoreCandidate: scoreRaw && getMaxScoreCandidate(scoreRaw, accuracy, false),
      };
    });

    const chartLevel = results[0].interpolated_difficulty || results[0].level;
    const maxPP = chartLevel && chartLevel ** 2.2 / 7.6;

    let maxScore = 0;

    for (const result of results) {
      if (result.maxScoreCandidate && maxScore < result.maxScoreCandidate) {
        maxScore = result.maxScoreCandidate;
      }
    }
    if (maxScore > 0) {
      for (const result of results) {
        if (result.scoreRaw && maxPP) {
          const K = Math.max(0, Math.min(1, result.scoreRaw / maxScore - 0.3) / 0.7);
          const pp = K * maxPP;
          resultPpMap.set(result.id, pp);
        } else {
          resultPpMap.set(result.id, null);
        }
      }
    }
  }
  return resultPpMap;
};
