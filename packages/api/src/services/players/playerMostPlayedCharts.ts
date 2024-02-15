import { Transaction, db } from 'db';
import { sql } from 'kysely';

export const getPlayerMostPlayedCharts = async (
  params: { playerId?: number; limit: number; offset: number },
  trx?: Transaction
): Promise<
  Array<{
    count: number;
    latestDate: Date; // seems like api actually returns string :(
    shared_chart: number;
    full_name: string;
    label: string;
  }>
> => {
  if (!params.playerId) {
    throw new Error('playerId is required');
  }
  return await (trx ?? db)
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
      ({ fn }) => fn.count<number>('r.id').as('count'),
      ({ fn }) => fn.max('r.gained').as('latestDate'),
      't.full_name',
      ({ fn }) => fn.max('ci.label').as('label'),
      'r.shared_chart',
    ])
    .groupBy('r.shared_chart')
    .where('r.player_id', '=', params.playerId)
    .orderBy('count', 'desc')
    .limit(params.limit)
    .offset(params.offset)
    .execute();
};
