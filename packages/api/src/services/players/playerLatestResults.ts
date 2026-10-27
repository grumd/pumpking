import { Transaction, db } from '@pumpking/database/db';
import { sql } from 'kysely';

// The player's results, newest first, without hidden ones. With `onlyBests`, only the results
// that were a new best score on their chart when played: no earlier result of the player on
// that chart has the same or a higher score. Other players see only these, so they can't
// follow every play
export const getPlayerLatestResults = async (
  params: { playerId?: number; onlyBests: boolean; limit: number; offset: number },
  trx?: Transaction
): Promise<
  Array<{
    id: number;
    date: Date;
    shared_chart: number;
    full_name: string;
    label: string;
    score: number | null;
    is_pass: boolean;
    pp: number | null;
  }>
> => {
  if (!params.playerId) {
    throw new Error('playerId is required');
  }

  let query = (trx ?? db)
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
      'r.score_phoenix as score',
      'r.is_pass',
      'r.pp',
      't.full_name',
      'ci.label',
      'r.shared_chart',
    ])
    .where('r.player_id', '=', params.playerId)
    .where('r.is_hidden', '=', 0);

  if (params.onlyBests) {
    query = query.where('r.score_phoenix', 'is not', null).where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('results as b')
            .select('b.id')
            .where('b.player_id', '=', sql.ref('r.player_id'))
            .where('b.shared_chart', '=', sql.ref('r.shared_chart'))
            .where('b.is_hidden', '=', 0)
            .where('b.score_phoenix', '>=', sql.ref('r.score_phoenix'))
            .where(({ or, and, cmpr }) =>
              or([
                cmpr('b.gained', '<', sql.ref('r.gained')),
                and([
                  cmpr('b.gained', '=', sql.ref('r.gained')),
                  cmpr('b.id', '<', sql.ref('r.id')),
                ]),
              ])
            )
        )
      )
    );
  }

  const rows = await query
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
