import { db, type Transaction } from '@pumpking/database/db';
import { minMixToGetPp } from '@pumpking/utils/currentMix';

// A result's full pp. The age of the result only lowers what it adds to the player's
// total (see services/players/totalPp.ts), not this value
export const getResultPp = (scorePhoenix: number, chartLevel: number) => {
  const maxPP = chartLevel ** 2.4 / 13;
  const scoreRatio = scorePhoenix / 1_000_000;
  // K is a coefficient from 0 to 1
  // Growing exponentially from 500k score (0) to 1000k score (1)
  // 900k score is ~64% of max PP
  const K = Math.min(1, scoreRatio < 0.5 ? 0 : Math.pow((scoreRatio - 0.5) / 0.5, 2));
  return K * maxPP;
};

// pp of every result that gets pp, not only each player's best on a chart: an older best
// can count for less than a newer result on the same chart. Results of hidden players,
// co-op charts and old mixes get none
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
    const chartLevel = result.interpolated_difficulty || result.level;
    resultPpMap.set(
      result.id,
      result.score_phoenix && chartLevel ? getResultPp(result.score_phoenix, chartLevel) : null
    );
  }

  return resultPpMap;
};
