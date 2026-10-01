import { Kysely, sql } from 'kysely';

/**
 * Rank mode (VJ) results count like any other result now: they get a score_phoenix
 * from their stats, like the Python ingestion and the manual add already store. The
 * 2024 migrations skipped them, so almost all old ones have none (and so no exp, no pp,
 * and no place on the leaderboard).
 *
 * This computes score_phoenix (the formula of scoring/phoenixScore.ts), then the exp of
 * those results (profile/exp.ts) and every player's total exp (services/players/playerExp.ts
 * in the API). pp is left to the nightly chart difficulty job, which recalculates all
 * results' pp and players' total pp.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    UPDATE results
    -- E0 makes the literals DOUBLE, so this rounds like the JS function does (exact
    -- DECIMAL arithmetic can come out 1 higher)
    SET score_phoenix = FLOOR(
      (1000000E0 * (0.995E0 * (perfects + 0.6E0 * greats + 0.2E0 * goods + 0.1E0 * bads) + 0.005E0 * max_combo))
      / (perfects + greats + goods + bads + misses)
    )
    WHERE rank_mode = 1
    AND score_phoenix IS NULL
    AND perfects IS NOT NULL
    AND greats IS NOT NULL
    AND goods IS NOT NULL
    AND bads IS NOT NULL
    AND misses IS NOT NULL
    AND max_combo IS NOT NULL
    AND perfects + greats + goods + bads + misses > 0
  `.execute(db);

  // "update .. inner join .. set" is not supported by kysely, using raw sql
  await sql`
    UPDATE results AS r
    INNER JOIN chart_instances AS ci ON ci.id = r.chart_instance
    -- As profile/exp.ts, in DOUBLE like the score above
    SET r.exp = CASE
      WHEN ci.label LIKE 'COOP%'
        THEN ci.level * 50E0 * GREATEST(0.1E0, ((r.score_phoenix - 400000) * 2E0) / 1000000E0)
      ELSE (POW(ci.level, 2.31E0) * GREATEST(0.1E0, ((r.score_phoenix - 400000) * 2E0) / 1000000E0)) / 9E0
    END
    WHERE r.rank_mode = 1
    AND r.exp IS NULL
    AND r.score_phoenix IS NOT NULL
    AND ci.level IS NOT NULL
  `.execute(db);

  await db
    .updateTable('players')
    .set((eb) => ({
      exp: db
        .with('ranked_results', (_db) =>
          _db
            .selectFrom('results as r')
            .select([
              'player_id',
              'exp',
              sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
                'exp'
              )} desc)`.as('exp_rank'),
            ])
            .where('exp', 'is not', null)
        )
        .selectFrom('ranked_results')
        .select((eb2) => eb2.fn.sum<number>('ranked_results.exp').as('total_exp'))
        .whereRef('ranked_results.player_id', '=', eb.ref('players.id'))
        .where('ranked_results.exp_rank', '=', 1),
    }))
    .execute();
}

// Not reversible: the few rank mode results that already had a score_phoenix can't be
// told apart from the ones this filled in
export async function down(db: Kysely<any>): Promise<void> {}
