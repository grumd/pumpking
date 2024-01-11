import { Transaction, db } from 'db';
import { sql } from 'kysely';
import _ from 'lodash/fp';
import { GradePhoenix, phoenixGradeOrder } from 'utils/scoring/grades';

export const getPlayerGradeStats = async (
  playerId: number,
  trx?: Transaction
): Promise<{
  totalCounts: { level: number; type: 'S' | 'D'; count: number }[];
  gradeCounts: { level: number; type: 'S' | 'D'; grade: GradePhoenix; count: number }[];
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
        .selectFrom('results')
        .leftJoin('chart_instances', (join) =>
          // take level/type from the latest mix
          join.on('chart_instances.id', '=', (eb) =>
            eb
              .selectFrom('chart_instances')
              .select('id')
              .where('shared_chart', '=', sql.ref('results.shared_chart'))
              .where('type', 'is not', null)
              .where('level', '>', 0)
              .orderBy('mix', 'desc')
              .limit(1)
          )
        )
        .select([
          'level',
          'type',
          sql<number>`case
            when ${sql.ref('score_phoenix')} < 450000 then 15
            when ${sql.ref('score_phoenix')} < 550000 then 14
            when ${sql.ref('score_phoenix')} < 650000 then 13
            when ${sql.ref('score_phoenix')} < 750000 then 12
            when ${sql.ref('score_phoenix')} < 825000 then 11
            when ${sql.ref('score_phoenix')} < 900000 then 10
            when ${sql.ref('score_phoenix')} < 925000 then 9
            when ${sql.ref('score_phoenix')} < 950000 then 8
            when ${sql.ref('score_phoenix')} < 960000 then 7
            when ${sql.ref('score_phoenix')} < 970000 then 6
            when ${sql.ref('score_phoenix')} < 975000 then 5
            when ${sql.ref('score_phoenix')} < 980000 then 4
            when ${sql.ref('score_phoenix')} < 985000 then 3
            when ${sql.ref('score_phoenix')} < 990000 then 2
            when ${sql.ref('score_phoenix')} < 995000 then 1
            else 0 end`.as('grade_phoenix_order'),
          sql<number>`row_number() over (partition by results.shared_chart, results.player_id order by ${sql.ref(
            'score_phoenix'
          )} desc)`.as('score_rank'),
        ])
        .where('player_id', '=', playerId)
        .where('score_phoenix', 'is not', null)
        .$narrowType<{ level: number; type: 'S' | 'D' }>();
    })
    .selectFrom('ranked_results')
    .select((eb) => ['level', 'type', 'grade_phoenix_order', eb.fn.countAll<number>().as('count')])
    .where('score_rank', '=', 1)
    .groupBy(['level', 'type', 'grade_phoenix_order'])
    .orderBy('level')
    .execute();

  const totalCounts = await (trx ?? db)
    .selectFrom('shared_charts')
    .leftJoin('chart_instances', (join) =>
      // take level/type from the latest mix even if the player only played older mixes
      join.on('chart_instances.id', '=', (eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('shared_chart', '=', sql.ref('shared_charts.id'))
          .where('type', 'is not', null)
          .where('level', '>', 0)
          .orderBy('mix', 'desc')
          .limit(1)
      )
    )
    .select(['level', 'type', (eb) => eb.fn.countAll<number>().as('count')])
    .where(({ exists }) =>
      // but only take shared_charts that exist in the mixes the player played
      exists((eb) =>
        eb
          .selectFrom('chart_instances')
          .select('id')
          .where('mix', 'in', mixesPlayed)
          .where('shared_chart', '=', sql.ref('shared_charts.id'))
      )
    )
    .groupBy(['level', 'type'])
    .orderBy('level')
    .$narrowType<{ level: number; type: 'S' | 'D' }>()
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
