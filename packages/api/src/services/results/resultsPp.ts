import { minMixToGetPp } from 'constants/currentMix';
import { db, type Transaction } from 'db';
import { sql } from 'kysely';
import _ from 'lodash/fp';

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
    .with('ranked_results', (_db) => {
      return _db
        .selectFrom('results')
        .innerJoin('chart_instances', 'chart_instances.id', 'results.chart_instance')
        .innerJoin('players', 'players.id', 'results.player_id')
        .select([
          'results.id',
          'results.score_phoenix',
          'results.shared_chart',
          'results.chart_instance',
          'chart_instances.level',
          'chart_instances.interpolated_difficulty',
          sql<number>`row_number() over (partition by results.shared_chart, results.player_id order by ${sql.ref(
            'score_phoenix'
          )} desc)`.as('score_rank'),
        ])
        .where('players.hidden', '=', 0)
        .where('score_phoenix', 'is not', null)
        .where('results.mix', '>=', minMixToGetPp)
        .where('chart_label', 'not like', 'COOP%');
    })
    .selectFrom('ranked_results')
    .selectAll()
    .where('score_rank', '=', 1);

  if (sharedChartId) {
    query = query.where('shared_chart', '=', sharedChartId);
  }

  if (resultId) {
    query = query.where('id', '=', resultId);
  }

  const allBestResults = await query.execute();

  const byChartInstance = _.groupBy((res) => res.chart_instance, allBestResults);

  const resultPpMap = new Map<number, number | null>();

  for (const chartInstanceId in byChartInstance) {
    const chartLevel =
      byChartInstance[chartInstanceId][0].interpolated_difficulty ||
      byChartInstance[chartInstanceId][0].level;
    const maxPP = chartLevel && chartLevel ** 2.4 / 13;

    for (const result of byChartInstance[chartInstanceId]) {
      if (result.score_phoenix && maxPP) {
        const scoreRatio = result.score_phoenix / 1_000_000;
        // K is a coefficient from 0 to 1
        // Growing exponentially from 500k score (0) to 1000k score (1)
        // 900k score is ~64% of max PP
        const K = Math.min(1, scoreRatio < 0.5 ? 0 : Math.pow((scoreRatio - 0.5) / 0.5, 2));
        const pp = K * maxPP;
        resultPpMap.set(result.id, pp);
      } else {
        resultPpMap.set(result.id, null);
      }
    }
  }

  return resultPpMap;
};
