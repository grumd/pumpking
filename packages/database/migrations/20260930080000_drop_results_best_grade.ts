import { Kysely, sql } from 'kysely';

/**
 * P4b of the Python API migration (docs/python-api-migration/PLAN.md): nothing has read
 * `results_best_grade` for years, and since P4a nothing writes it.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE results_best_grade`.execute(db);
}

/**
 * Brings the table back empty, in its P4a shape (no foreign keys). Its rows are gone.
 */
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE results_best_grade (
      player_id int NOT NULL,
      shared_chart_id int NOT NULL,
      result_id int NOT NULL,
      UNIQUE KEY results_best_grade_player_id_shared_chart_id_unique (player_id, shared_chart_id),
      KEY results_best_grade_shared_chart_id_foreign (shared_chart_id),
      KEY results_best_grade_result_id_foreign (result_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1
  `.execute(db);
}
