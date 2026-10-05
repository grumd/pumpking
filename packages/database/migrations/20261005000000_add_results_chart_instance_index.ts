import { Kysely, sql } from 'kysely';

/**
 * Finding a chart instance's results (the admin track view counts them per instance and
 * lists them newest first). InnoDB adds the primary key to the index, so it's in
 * (chart_instance, id) order: counts read only the index, and a page of results newest
 * first needs no sort. Built in place, without locking results for ingestion
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE results
      ADD INDEX results_chart_instance (chart_instance),
      ALGORITHM = INPLACE,
      LOCK = NONE
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE results DROP INDEX results_chart_instance`.execute(db);
}
