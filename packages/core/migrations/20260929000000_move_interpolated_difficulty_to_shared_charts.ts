import { Kysely, sql } from 'kysely';

/**
 * ID is one value per shared chart, so it lives on `shared_charts`. The
 * per-instance copy is dropped by the next migration.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE shared_charts
    ADD COLUMN interpolated_difficulty FLOAT(8, 2) NULL
  `.execute(db);

  await sql`
    UPDATE shared_charts sc
    JOIN (
      SELECT shared_chart, MAX(interpolated_difficulty) AS difficulty
      FROM chart_instances
      WHERE interpolated_difficulty IS NOT NULL
      GROUP BY shared_chart
    ) ci ON ci.shared_chart = sc.id
    SET sc.interpolated_difficulty = ci.difficulty
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE shared_charts DROP COLUMN interpolated_difficulty`.execute(db);
}
