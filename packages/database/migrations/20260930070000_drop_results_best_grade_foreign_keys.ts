import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results_best_grade
      DROP FOREIGN KEY results_best_grade_player_id_foreign,
      DROP FOREIGN KEY results_best_grade_result_id_foreign,
      DROP FOREIGN KEY results_best_grade_shared_chart_id_foreign
  `.execute(db);
}

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
