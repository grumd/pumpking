import { Kysely, sql } from 'kysely';

/**
 * P4a of the Python API migration (docs/python-api-migration/PLAN.md): nothing reads
 * `results_best_grade`, and from this release on nothing writes it either. Its foreign
 * keys go first, so deleting a result it still points at doesn't fail. P4b drops the
 * table once no deployed service uses it (the migration guard runs the deployed
 * commit's tests against the new schema, and the code before P4a still writes it).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results_best_grade
      DROP FOREIGN KEY results_best_grade_player_id_foreign,
      DROP FOREIGN KEY results_best_grade_result_id_foreign,
      DROP FOREIGN KEY results_best_grade_shared_chart_id_foreign
  `.execute(db);
}

/**
 * Fails if rows point at results, players or charts that were deleted in the meantime.
 */
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results_best_grade
      ADD CONSTRAINT results_best_grade_player_id_foreign
        FOREIGN KEY (player_id) REFERENCES players (id),
      ADD CONSTRAINT results_best_grade_result_id_foreign
        FOREIGN KEY (result_id) REFERENCES results (id),
      ADD CONSTRAINT results_best_grade_shared_chart_id_foreign
        FOREIGN KEY (shared_chart_id) REFERENCES shared_charts (id)
  `.execute(db);
}
