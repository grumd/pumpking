import { getPlayerPpResults } from './playersPp';
import { getCountedCharts, ppAgeFactor, roundPp, utcDay } from './totalPp';
import { db } from '@pumpking/database/db';
import { sql } from 'kysely';

/**
 * The charts that make up the player's total pp, by how much each one adds: its counted
 * result (the most pp after the age factor), the chart's difficulty, the age factor and the
 * weight of its place. With the number of charts and the total they add up to
 */
export const getPlayerPpBreakdown = async (params: {
  playerId?: number;
  limit: number;
  offset: number;
}) => {
  if (!params.playerId) {
    throw new Error('playerId is required');
  }

  const today = utcDay(new Date());
  const counted = getCountedCharts(await getPlayerPpResults(params.playerId), today);
  const totalPp = roundPp(counted.reduce((sum, chart) => sum + chart.pp * chart.weight, 0));
  const page = counted.slice(params.offset, params.offset + params.limit);
  if (!page.length) {
    return { items: [], total: counted.length, totalPp };
  }

  const details = await db
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
      'r.grade',
      'r.score_phoenix as score',
      'r.is_pass',
      't.full_name',
      'ci.label',
      'sc.interpolated_difficulty as difficulty',
    ])
    .where(
      'r.id',
      'in',
      page.map((chart) => chart.result.id)
    )
    .execute();
  const detailsById = new Map(details.map((row) => [row.id, row]));

  const items = page.flatMap(({ result, pp, weight }) => {
    const row = detailsById.get(result.id);
    if (!row) {
      return [];
    }
    return [
      {
        shared_chart: result.sharedChartId,
        full_name: row.full_name,
        label: row.label,
        difficulty: row.difficulty,
        grade: row.grade,
        score: row.score,
        is_pass: row.is_pass === 1,
        date: result.gained,
        pp: result.pp,
        ageFactor: ppAgeFactor(today - utcDay(result.gained)),
        weight,
        contribution: pp * weight,
      },
    ];
  });

  return { items, total: counted.length, totalPp };
};
