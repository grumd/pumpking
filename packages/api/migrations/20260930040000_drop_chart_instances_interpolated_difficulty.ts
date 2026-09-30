import { Kysely, sql } from 'kysely';

/**
 * Nothing reads the per-instance copy of the difficulty anymore (the piu-top
 * backend-ts API that did is not deployed), so ID lives only on `shared_charts`.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE chart_instances DROP COLUMN interpolated_difficulty
  `.execute(db);
}

/**
 * Re-prefills from `shared_charts`. Per-chart values come back identical on
 * every mix of the chart - the pre-move state where two instances of one chart
 * disagreed is not recoverable.
 */
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
