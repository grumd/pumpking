import { ExpressionBuilder, Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // "update .. inner join .. set" is not supported by kysely, using raw sql
  // NOT COOP
  await sql`
    UPDATE
      results AS r
    INNER JOIN shared_charts AS sc ON
      sc.id = r.shared_chart
    INNER JOIN chart_instances AS ci ON
      ci.shared_chart = sc.id AND ci.mix = r.mix
    SET
      exp = GREATEST(0.1, ((score_phoenix - 400000) * 2 / 1000000)) * POW(\`level\`, 2.31) / 9
    WHERE score_phoenix IS NOT NULL
    AND ci.level IS NOT NULL
    AND ci.label NOT LIKE 'COOP%'
  `.execute(db);

  // COOP
  await sql`
    UPDATE
      results AS r
    INNER JOIN shared_charts AS sc ON
      sc.id = r.shared_chart
    INNER JOIN chart_instances AS ci ON
      ci.shared_chart = sc.id AND ci.mix = r.mix
    SET
      exp = GREATEST(0.1, (score_phoenix - 400000) * 2 / 1000000) * 50 * \`level\`
    WHERE score_phoenix IS NOT NULL
    AND ci.level IS NOT NULL
    AND ci.label LIKE 'COOP%'
  `.execute(db);

  await db
    .updateTable('players')
    .set((eb) => ({
      exp: db
        .with('ranked_results', (_db) => {
          return _db
            .selectFrom('results as r')
            .select([
              'player_id',
              'exp',
              sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
                'exp'
              )} desc)`.as('exp_rank'),
            ])
            .where('exp', 'is not', null);
        })
        .selectFrom('ranked_results')
        .select((eb2) => eb2.fn.sum<number>('ranked_results.exp').as('total_exp'))
        .whereRef('ranked_results.player_id', '=', eb.ref('players.id'))
        .where('ranked_results.exp_rank', '=', 1),
    }))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {}
