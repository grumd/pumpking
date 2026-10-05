import { Kysely, sql } from 'kysely';

/**
 * The leaderboard search finds, for each chart, the latest best result (newest first by
 * added) and, sorting by pp, the best result with the most pp. Both read a chart's results
 * from these indexes alone, in that order, and stop at the first result that is a
 * player's best. Checking that a result is a player's best reads the player index, which
 * now has the mix and the date too. Built in place, without locking results for ingestion
 */
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
