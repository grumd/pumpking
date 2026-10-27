import { Transaction, db } from '@pumpking/database/db';
import { GradePhoenix, phoenixGradeOrder } from '@pumpking/utils/grades';
import { sql } from 'kysely';

// Chart type is read from shared_charts.type - the canonical per-chart type
// (S/D/HD/COOP) maintained by the tracklist update process. COOP charts are
// excluded from these S/D/HD stats. (chart_instances.type is import-time data
// that drifted - whole mixes left NULL - so it is not read.)
export type GradeStatsChartType = 'S' | 'D' | 'HD';

const gradeableTypes: GradeStatsChartType[] = ['S', 'D', 'HD'];

export const getPlayerGradeStats = async (
  playerId: number,
  trx?: Transaction
): Promise<{
  totalCounts: { level: number; type: GradeStatsChartType; count: number }[];
  gradeCounts: { level: number; type: GradeStatsChartType; grade: GradePhoenix; count: number }[];
}> => {
  const mixesPlayed = (
    await (trx ?? db)
      .selectFrom('results')
      .select('mix')
      .distinct()
      .where('player_id', '=', playerId)
      .execute()
  ).map(({ mix }) => mix);

  // The grade of the player's best score on each chart
  const gradeStats = await (trx ?? db)
    .selectFrom((eb) =>
      eb
        .selectFrom('results')
        .select(['shared_chart', (eb) => eb.fn.max('score_phoenix').as('score')])
        .where('player_id', '=', playerId)
        .where('score_phoenix', 'is not', null)
        .groupBy('shared_chart')
        .as('best')
    )
    .innerJoin('shared_charts as sc', 'sc.id', 'best.shared_chart')
    .leftJoin('chart_instances as latest_ci', (join) =>
      // take the level from the chart's latest-mix instance ((shared_chart, mix) is unique)
      join.on('latest_ci.id', '=', (eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('shared_chart', '=', sql.ref('best.shared_chart'))
          .orderBy('mix', 'desc')
          .limit(1)
      )
    )
    .select((eb) => [
      'latest_ci.level as level',
      'sc.type as type',
      // Phoenix 2 (mix 28) grade formula - the latest one, applied to all mixes
      sql<number>`case
        when ${sql.ref('best.score')} < 500000 then 15
        when ${sql.ref('best.score')} < 600000 then 14
        when ${sql.ref('best.score')} < 700000 then 13
        when ${sql.ref('best.score')} < 800000 then 12
        when ${sql.ref('best.score')} < 900000 then 11
        when ${sql.ref('best.score')} < 920000 then 10
        when ${sql.ref('best.score')} < 940000 then 9
        when ${sql.ref('best.score')} < 950000 then 8
        when ${sql.ref('best.score')} < 960000 then 7
        when ${sql.ref('best.score')} < 970000 then 6
        when ${sql.ref('best.score')} < 975000 then 5
        when ${sql.ref('best.score')} < 980000 then 4
        when ${sql.ref('best.score')} < 985000 then 3
        when ${sql.ref('best.score')} < 990000 then 2
        when ${sql.ref('best.score')} < 995000 then 1
        else 0 end`.as('grade_phoenix_order'),
      eb.fn.countAll<number>().as('count'),
    ])
    .where('sc.type', 'in', gradeableTypes)
    .groupBy(['level', 'type', 'grade_phoenix_order'])
    .orderBy('level')
    .$narrowType<{ type: GradeStatsChartType; level: number }>()
    .execute();

  const totalCounts = await (trx ?? db)
    .selectFrom('shared_charts as sc')
    .leftJoin('chart_instances as latest_ci', (join) =>
      // take the level from the latest mix even if the player only played older mixes
      join.on('latest_ci.id', '=', (eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('shared_chart', '=', sql.ref('sc.id'))
          .orderBy('mix', 'desc')
          .limit(1)
      )
    )
    .select([
      'sc.type as type',
      'latest_ci.level as level',
      (eb) => eb.fn.countAll<number>().as('count'),
    ])
    .where('sc.type', 'in', gradeableTypes)
    .where(({ exists }) =>
      // but only take shared_charts that exist in the mixes the player played
      exists((eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('mix', 'in', mixesPlayed)
          .where('shared_chart', '=', sql.ref('sc.id'))
      )
    )
    .groupBy(['sc.type', 'latest_ci.level'])
    .orderBy('latest_ci.level')
    .$narrowType<{ level: number; type: GradeStatsChartType; count: number }>()
    .execute();

  const gradeCounts = gradeStats.map(({ grade_phoenix_order, ...rest }) => ({
    ...rest,
    grade: phoenixGradeOrder[grade_phoenix_order],
  }));

  return {
    totalCounts,
    gradeCounts,
  };
};
