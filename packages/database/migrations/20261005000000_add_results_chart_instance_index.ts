import { Kysely, sql } from 'kysely';

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
