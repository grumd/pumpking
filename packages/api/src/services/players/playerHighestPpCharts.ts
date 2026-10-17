import { Transaction, db } from '@pumpking/database/db';
import { sql } from 'kysely';

export const getPlayerHighestPpCharts = async (
  params: { playerId?: number; limit: number; offset: number },
  trx?: Transaction
): Promise<
  Array<{
    pp: number;
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
    .where('r.pp', 'is not', null)
    // One result per chart: the one with the most pp, the earliest of equal ones
    .where(({ not, exists }) =>
      not(
        exists(
          db
            .selectFrom('results as b')
            .select('b.id')
            .where('b.player_id', '=', sql.ref('r.player_id'))
            .where('b.shared_chart', '=', sql.ref('r.shared_chart'))
            .where('b.pp', '>=', sql.ref('r.pp'))
            .where(({ or, cmpr }) =>
              or([cmpr('b.pp', '>', sql.ref('r.pp')), cmpr('b.id', '<', sql.ref('r.id'))])
            )
        )
      )
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

  return result.map((row) => ({
    ...row,
    date: new Date(row.date),
    is_pass: row.is_pass === 1,
  }));
};
