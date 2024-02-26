import { Transaction, db } from 'db';
import { sql } from 'kysely';

export const getPlayerHighestPpCharts = async (
  params: { playerId?: number; limit: number; offset: number },
  trx?: Transaction
): Promise<
  Array<{
    pp: number;
    weight: number;
    date: Date; // seems like api actually returns string :(
    shared_chart: number;
    full_name: string;
    label: string;
    grade: string | null;
    score: number | null;
    is_pass: boolean;
  }>
> => {
  if (!params.playerId) {
    throw new Error('playerId is required');
  }

  const query = (trx ?? db)
    .selectFrom('results as r')
    .innerJoin('shared_charts as sc', 'r.shared_chart', 'sc.id')
    .innerJoin('chart_instances as ci', (join) =>
      join.on('ci.id', '=', (eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('shared_chart', '=', sql.ref('r.shared_chart'))
          .orderBy('mix', 'desc')
          .limit(1)
      )
    )
    .innerJoin('tracks as t', 't.id', 'sc.track')
    .innerJoin(
      (eb) =>
        eb
          .selectFrom('results')
          .select(({ fn }) => ['player_id', 'shared_chart', fn.max('pp').as('best_pp')])
          .groupBy(['shared_chart', 'player_id'])
          .where('pp', 'is not', null)
          .as('max_pp_results'),
      (join) =>
        join
          .onRef('max_pp_results.player_id', '=', 'r.player_id')
          .onRef('max_pp_results.shared_chart', '=', 'r.shared_chart')
          .onRef('max_pp_results.best_pp', '=', `r.pp`)
    )
    .select([
      'pp',
      'r.gained as date',
      'r.grade',
      'r.score_phoenix as score',
      'r.is_pass',
      't.full_name',
      'ci.label',
      'r.shared_chart',
    ])
    .where('r.player_id', '=', params.playerId)
    .orderBy('pp', 'desc')
    .limit(params.limit)
    .offset(params.offset)
    .$narrowType<{ pp: number }>();

  const timeStart = performance.now();
  const result = await query.execute();
  const timeEnd = performance.now();
  console.log('query time:', timeEnd - timeStart, 'ms');

  return result.map((row, index) => ({
    ...row,
    date: new Date(row.date),
    weight: 0.95 ** (index + params.offset),
    is_pass: row.is_pass === 1,
  }));
};
