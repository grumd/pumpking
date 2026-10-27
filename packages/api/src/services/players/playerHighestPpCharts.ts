import { getPlayerPpResults } from './playersPp';
import { ppAgeFactor, utcDay } from './totalPp';
import { Transaction, db } from '@pumpking/database/db';
import { sql } from 'kysely';
import { type PpSteps, getPpSteps } from 'services/results/resultsPp';

/**
 * The player's best result on each chart by its full pp, however old: a page of them, with
 * the steps to the pp and the result's age factor, and the number of charts
 */
export const getPlayerHighestPpCharts = async (
  params: { playerId?: number; limit: number; offset: number },
  trx?: Transaction
): Promise<{
  items: Array<{
    pp: number;
    date: Date; // seems like api actually returns string :(
    shared_chart: number;
    full_name: string;
    label: string;
    ppSteps: PpSteps | null;
    grade: string | null;
    score: number | null;
    is_pass: boolean;
    ageFactor: number;
  }>;
  total: number;
}> => {
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
    // The result's own chart instance, whose level pp falls back to
    .innerJoin('chart_instances as ri', 'ri.id', 'r.chart_instance')
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
      'sc.interpolated_difficulty',
      'ri.level',
      'r.shared_chart',
    ])
    .where('r.player_id', '=', params.playerId)
    .orderBy('pp', 'desc')
    .limit(params.limit)
    .offset(params.offset)
    .$narrowType<{ pp: number }>();

  const timeStart = performance.now();
  const [rows, ppResults] = await Promise.all([
    query.execute(),
    getPlayerPpResults(params.playerId, trx),
  ]);
  const timeEnd = performance.now();
  console.log('query time:', timeEnd - timeStart, 'ms');

  const today = utcDay(new Date());
  const items = rows.map((row) => {
    const { interpolated_difficulty, level, ...rest } = row;
    const date = new Date(row.date);
    return {
      ...rest,
      date,
      ppSteps: getPpSteps({ score: row.score, interpolated_difficulty, level }),
      is_pass: row.is_pass === 1,
      ageFactor: ppAgeFactor(today - utcDay(date)),
    };
  });

  return {
    items,
    total: new Set(ppResults.map((result) => result.sharedChartId)).size,
  };
};
