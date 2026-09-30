import { ExpressionBuilder, Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('results').addColumn('exp', 'decimal(7, 2)').execute();
  await db.schema.alterTable('players').addColumn('exp', 'decimal(10, 2)').execute();

  // "update .. inner join .. set" is not supported by kysely
  await sql`WITH ranked_results AS (
    SELECT
      r.id AS result_id,
      r.player_id,
      ci.label,
      ci.level,
      score_phoenix AS score,
      ROW_NUMBER() OVER (PARTITION BY r.shared_chart, r.player_id ORDER BY score_phoenix DESC) AS score_rank
    FROM
      results AS r
    INNER JOIN shared_charts AS sc ON
      sc.id = r.shared_chart
    INNER JOIN chart_instances AS ci ON
      ci.shared_chart = sc.id
      AND ci.mix = r.mix
    WHERE
      score IS NOT NULL
      AND ci.label NOT LIKE 'COOP%'
  )
  UPDATE
    results
  INNER JOIN ranked_results ON
    results.id = ranked_results.result_id
  SET
    exp = GREATEST(0.1, ((score_phoenix - 400000) * 2 / 1000000)) * POW(\`level\`, 2.31) / 9
  WHERE
    score_rank = 1;`.execute(db);

  await sql`WITH ranked_results AS (
    SELECT
      r.id AS result_id,
      r.player_id,
      ci.label,
      ci.level,
      score_phoenix AS score,
      ROW_NUMBER() OVER (PARTITION BY r.shared_chart, r.player_id ORDER BY score_phoenix DESC) AS score_rank
    FROM
      results AS r
    INNER JOIN shared_charts AS sc ON
      sc.id = r.shared_chart
    INNER JOIN chart_instances AS ci ON
      ci.shared_chart = sc.id
      AND ci.mix = r.mix
    WHERE
      score IS NOT NULL
      AND ci.label LIKE 'COOP%'
  )
  UPDATE
    results
  INNER JOIN ranked_results ON
    results.id = ranked_results.result_id
  SET
    exp = GREATEST(0.1, (score_phoenix - 400000) * 2 / 1000000) * 50 * \`level\`
  WHERE
    score_rank = 1;`.execute(db);

  await db
    .updateTable('players')
    .set((eb: ExpressionBuilder<any, any>) => ({
      exp: db
        .selectFrom('results')
        .select((eb2) => eb2.fn.sum<number>('results.exp').as('total_exp'))
        .whereRef('results.player_id', '=', eb.ref('players.id')),
    }))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('results').dropColumn('exp').execute();
  await db.schema.alterTable('players').dropColumn('exp').execute();
}
