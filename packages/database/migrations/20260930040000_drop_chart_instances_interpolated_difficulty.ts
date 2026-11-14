import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE chart_instances DROP COLUMN interpolated_difficulty
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE chart_instances ADD COLUMN interpolated_difficulty FLOAT(8, 2) NULL
  `.execute(db);

  await sql`
    UPDATE chart_instances ci
    JOIN shared_charts sc ON sc.id = ci.shared_chart
    SET ci.interpolated_difficulty = sc.interpolated_difficulty
    WHERE sc.interpolated_difficulty IS NOT NULL
  `.execute(db);
}
