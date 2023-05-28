import _ from 'lodash/fp';
import type { Knex } from 'knex';

import { knex } from 'db';

import { mix } from 'constants/currentMix';

import { getAccuracyPercent, getMaxScoreCandidate, getScoreWithoutBonus } from 'utils/results';
import { ResultHighestScoreNoRank } from 'models/ResultHighestScoreNoRank';

export const calculateResultsPp = async (
  sharedChartId?: number | null,
  transaction?: Knex.Transaction<any, any[]>
) => {
  let query = knex
    .query(ResultHighestScoreNoRank)
    .innerJoinColumn('result')
    .innerJoinColumn('result.chart_instance')
    .innerJoinColumn('player')
    .select(
      'result.id',
      'result.score_xx',
      'result.grade',
      'result.perfects',
      'result.greats',
      'result.goods',
      'result.bads',
      'result.misses',
      'result.shared_chart_id',
      'player_id',
      'result.chart_instance.level',
      'result.chart_instance.interpolated_difficulty'
    )
    .where('player.hidden', 0)
    .where('result.rank_mode', 0) // probably not needed because using ResultHighestScoreNoRank
    .where('result.mix', mix)
    .where('result.chart_label', 'NOT LIKE', 'COOP%')
    .orderBy('result.gained', 'desc');

  if (sharedChartId) {
    query = query.where('shared_chart_id', sharedChartId);
  }

  if (transaction) {
    query = query.transacting(transaction);
  }

  const allBestResults = await query.getMany();

  const sharedCharts = _.groupBy((res) => res.result.shared_chart_id, allBestResults);

  const resultPpMap = new Map<number, number>();

  for (const chartId in sharedCharts) {
    const results = sharedCharts[chartId].map((res) => {
      const accuracy = getAccuracyPercent(res.result);
      const scoreRaw = getScoreWithoutBonus(res.result.score_xx, res.result.grade);
      return {
        ...res.result,
        scoreRaw,
        accuracy,
        maxScoreCandidate: getMaxScoreCandidate(scoreRaw, accuracy, false),
      };
    });

    const chartLevel =
      results[0].chart_instance.interpolated_difficulty || results[0].chart_instance.level;
    const maxPP = chartLevel ** 2.2 / 7.6;

    let maxScore = 0;

    for (const result of results) {
      if (maxScore < result.maxScoreCandidate) {
        maxScore = result.maxScoreCandidate;
      }
    }
    if (maxScore > 0) {
      for (const result of results) {
        const K = Math.max(0, Math.min(1, result.scoreRaw / maxScore - 0.3) / 0.7);
        const pp = K * maxPP;
        resultPpMap.set(result.id, pp);
      }
    }
  }
  return resultPpMap;
};
