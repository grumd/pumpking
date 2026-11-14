import { db, type Transaction } from '@pumpking/database/db';
import { minMixToGetPp } from '@pumpking/utils/currentMix';

export const getResultPpSteps = (scorePhoenix: number, chartLevel: number) => {
  const maxPp = chartLevel ** 2.4 / 13;
  const scoreRatio = scorePhoenix / 1_000_000;
  const scoreFactor = Math.min(1, scoreRatio < 0.5 ? 0 : Math.pow((scoreRatio - 0.5) / 0.5, 2));
  return { chartLevel, maxPp, scoreFactor, pp: scoreFactor * maxPp };
};

export type PpSteps = ReturnType<typeof getResultPpSteps>;

export const getPpSteps = (row: {
  score: number | null;
  interpolated_difficulty: number | null;
  level: number | null;
}): PpSteps | null => {
  const chartLevel = row.interpolated_difficulty || row.level;
  return row.score && chartLevel ? getResultPpSteps(row.score, chartLevel) : null;
};

export const calculateResultsPp = async ({
  sharedChartId,
  resultId,
  trx,
}: {
  sharedChartId?: number | null;
  resultId?: number | null;
  trx?: Transaction;
} = {}) => {
  let query = (trx ?? db)
    .selectFrom('results')
    .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
    .innerJoin('shared_charts', 'shared_charts.id', 'results.shared_chart')
    .innerJoin('players', 'players.id', 'results.player_id')
    .select([
      'results.id',
      'results.score_phoenix',
      'chart_instances.level',
      'shared_charts.interpolated_difficulty',
    ])
    .where('players.hidden', '=', 0)
    .where('score_phoenix', 'is not', null)
    .where('results.mix', '>=', minMixToGetPp)
    .where('chart_label', 'not like', 'COOP%');

  if (sharedChartId) {
    query = query.where('results.shared_chart', '=', sharedChartId);
  }

  if (resultId) {
    query = query.where('results.id', '=', resultId);
  }

  const results = await query.execute();

  const resultPpMap = new Map<number, number | null>();

  for (const result of results) {
    const steps = getPpSteps({ ...result, score: result.score_phoenix });
    resultPpMap.set(result.id, steps?.pp ?? null);
  }

  return resultPpMap;
};
