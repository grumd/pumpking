import { Transaction, db } from '@pumpking/database/db';
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
  const { playerId } = params;
  if (!playerId) {
    throw new Error('playerId is required');
  }
  // The page of charts first, from the player's results alone, then the chart names for it
  return await (trx ?? db)
    .selectFrom((eb) =>
      eb
        .selectFrom('results')
        .select([
          'shared_chart',
          ({ fn }) => fn.count<number>('id').as('count'),
          ({ fn }) => fn.max('results.gained').as('latestDate'),
        ])
        .where('player_id', '=', playerId)
        .groupBy('shared_chart')
        .orderBy('count', 'desc')
        .orderBy('shared_chart')
        .limit(params.limit)
        .offset(params.offset)
        .as('played')
    )
    .innerJoin('shared_charts as sc', 'played.shared_chart', 'sc.id')
    .innerJoin('chart_instances as ci', (join) =>
      join.on('ci.id', '=', (eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('shared_chart', '=', sql.ref('played.shared_chart'))
          .orderBy('mix', 'desc')
          .limit(1)
      )
    )
    .innerJoin('tracks as t', 't.id', 'sc.track')
    .select(['played.count', 'played.latestDate', 't.full_name', 'ci.label', 'played.shared_chart'])
    .orderBy('played.count', 'desc')
    .orderBy('played.shared_chart')
    .execute();
};
