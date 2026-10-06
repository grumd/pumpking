import { Transaction, db } from '@pumpking/database/db';
import { sql } from 'kysely';

export const getPlayerLatestResults = async (
  params: { playerId?: number; limit: number; offset: number },
  trx?: Transaction
): Promise<
  Array<{
    id: number;
    date: Date;
    shared_chart: number;
    full_name: string;
    label: string;
    // The result's mix, and the mix of the chart instance the label is from (the newest)
    mix: number;
    label_mix: number;
    // The score in the result's mix; the grade comes from the Phoenix score
    score: number | null;
    score_phoenix: number | null;
    plate: string | null;
    is_pass: boolean;
    pp: number | null;
  }>
> => {
  if (!params.playerId) {
    throw new Error('playerId is required');
  }

  const rows = await (trx ?? db)
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
    .select([
      'r.id',
      'r.gained as date',
      'r.score',
      'r.score_phoenix',
      'r.plate',
      'r.is_pass',
      'r.pp',
      't.full_name',
      'ci.label',
      'r.mix',
      'ci.mix as label_mix',
      'r.shared_chart',
    ])
    .where('r.player_id', '=', params.playerId)
    .where('r.is_hidden', '=', 0)
    .orderBy('r.gained', 'desc')
    .orderBy('r.id', 'desc')
    .limit(params.limit)
    .offset(params.offset)
    .execute();

  return rows.map((row) => ({
    ...row,
    date: new Date(row.date),
    is_pass: row.is_pass === 1,
  }));
};
