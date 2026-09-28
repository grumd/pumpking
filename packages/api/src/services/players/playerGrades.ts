import { Transaction, db } from 'db';
import { sql } from 'kysely';
import { GradePhoenix, phoenixGradeOrder } from 'utils/scoring/grades';

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

  const gradeStats = await (trx ?? db)
    .with('ranked_results', (_db) => {
      return _db
        .selectFrom('results as r')
        .innerJoin('shared_charts as sc', 'sc.id', 'r.shared_chart')
        .leftJoin('chart_instances as latest_ci', (join) =>
          // take the level from the chart's latest-mix instance ((shared_chart, mix) is unique)
          join.on('latest_ci.id', '=', (eb) =>
            eb
              .selectFrom('chart_instances')
              .select('id')
              .where('shared_chart', '=', sql.ref('r.shared_chart'))
              .orderBy('mix', 'desc')
              .limit(1)
          )
        )
        .select([
          'sc.type as type',
          'latest_ci.level as level',
          sql<number>`case
            when ${sql.ref('r.score_phoenix')} < 450000 then 15
            when ${sql.ref('r.score_phoenix')} < 550000 then 14
            when ${sql.ref('r.score_phoenix')} < 650000 then 13
            when ${sql.ref('r.score_phoenix')} < 750000 then 12
            when ${sql.ref('r.score_phoenix')} < 825000 then 11
            when ${sql.ref('r.score_phoenix')} < 900000 then 10
            when ${sql.ref('r.score_phoenix')} < 925000 then 9
            when ${sql.ref('r.score_phoenix')} < 950000 then 8
            when ${sql.ref('r.score_phoenix')} < 960000 then 7
            when ${sql.ref('r.score_phoenix')} < 970000 then 6
            when ${sql.ref('r.score_phoenix')} < 975000 then 5
            when ${sql.ref('r.score_phoenix')} < 980000 then 4
            when ${sql.ref('r.score_phoenix')} < 985000 then 3
            when ${sql.ref('r.score_phoenix')} < 990000 then 2
            when ${sql.ref('r.score_phoenix')} < 995000 then 1
            else 0 end`.as('grade_phoenix_order'),
          sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            'r.score_phoenix'
          )} desc)`.as('score_rank'),
        ])
        .where('r.player_id', '=', playerId)
        .where('r.score_phoenix', 'is not', null)
        .where('sc.type', 'in', gradeableTypes)
        .$narrowType<{ type: GradeStatsChartType; level: number }>();
    })
    .selectFrom('ranked_results')
    .select((eb) => ['level', 'type', 'grade_phoenix_order', eb.fn.countAll<number>().as('count')])
    .where('score_rank', '=', 1)
    .groupBy(['level', 'type', 'grade_phoenix_order'])
    .orderBy('level')
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
