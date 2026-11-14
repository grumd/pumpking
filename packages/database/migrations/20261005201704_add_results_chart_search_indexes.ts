import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results
      ADD INDEX results_shared_chart_added (shared_chart, added, mix, score_phoenix, player_id),
      ADD INDEX results_shared_chart_pp (shared_chart, pp, mix, score_phoenix, player_id, added),
      DROP INDEX index_results_player_id_shared_chart_score_phoenix,
      ADD INDEX index_results_player_id_shared_chart_score_phoenix
        (player_id, shared_chart, score_phoenix, mix, added),
      ALGORITHM = INPLACE,
      LOCK = NONE
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results
      DROP INDEX results_shared_chart_added,
      DROP INDEX results_shared_chart_pp,
      DROP INDEX index_results_player_id_shared_chart_score_phoenix,
      ADD INDEX index_results_player_id_shared_chart_score_phoenix
        (player_id, shared_chart, score_phoenix)
  `.execute(db);
}
