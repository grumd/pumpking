import { Kysely, sql } from 'kysely';

/**
 * The profile reads a player's results newest first (latest results, last time played) and
 * stops after a page. Many queries take the latest-mix instance of a chart by its shared
 * chart, ordered by mix: the shared_chart index gets the mix, so this reads the index alone.
 * Built in place, without locking results for ingestion
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results
      ADD INDEX results_player_id_gained (player_id, gained),
      ALGORITHM = INPLACE,
      LOCK = NONE
  `.execute(db);
  await sql`
    ALTER TABLE chart_instances
      DROP INDEX shared_chart,
      ADD INDEX chart_instances_shared_chart_mix (shared_chart, mix),
      ALGORITHM = INPLACE,
      LOCK = NONE
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results
      DROP INDEX results_player_id_gained
  `.execute(db);
  await sql`
    ALTER TABLE chart_instances
      DROP INDEX chart_instances_shared_chart_mix,
      ADD INDEX shared_chart (shared_chart)
  `.execute(db);
}
