import { Kysely, sql } from 'kysely';

/**
 * Adds `shared_charts.type` - the canonical chart type (S/D/HD/COOP) per shared
 * chart. COOP is an explicit value, so the column is NOT NULL.
 *
 * Production already has this column: it was added and is maintained by the
 * manual tracklist update process. For such databases this migration is a
 * no-op. For fresh databases (test DBs, clones of older prod dumps) it adds
 * the column and backfills it from the latest-mix chart label - the label->type
 * mapping below reproduces the prod values 1:1 for all 8,543 charts
 * (verified 2026-09-28 against the 2026-09-27 prod dump).
 *
 * `chart_instances.type` is deliberately left alone: it is import-time data
 * that drifted (whole mixes left NULL, Dp co-op rows stamped 'D') and nothing
 * reads it anymore.
 */
export async function up(db: Kysely<any>): Promise<void> {
  const { rows } = await sql<{ c: number }>`
    SELECT COUNT(*) AS c
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'shared_charts'
      AND column_name = 'type'
  `.execute(db);
  if (rows.length > 0 && Number(rows[0].c) > 0) {
    return; // already added by the tracklist update process
  }

  // Nullable first so the ALTER works on non-empty tables, then backfill and enforce.
  await sql`ALTER TABLE shared_charts ADD COLUMN type ENUM('S','D','HD','COOP') NULL`.execute(
    db
  );
  // Latest-mix label -> type. The experimental pre-Prime families resolve to the
  // modern family the way prod does: HD-x/CZ-x/NL-x(a) -> S, FS-x(a)/NM-x(a) -> D,
  // Dp/Sp keep their family, and the (xN) co-op placeholders are COOP.
  await sql`
    UPDATE shared_charts sc
    JOIN (
      SELECT shared_chart, label
      FROM (
        SELECT shared_chart, label,
               ROW_NUMBER() OVER (PARTITION BY shared_chart ORDER BY mix DESC) AS rn
        FROM chart_instances
      ) t
      WHERE rn = 1
    ) ci ON ci.shared_chart = sc.id
    SET sc.type = CASE
      WHEN ci.label REGEXP '^HD[0-9]' THEN 'HD'
      WHEN ci.label LIKE 'COOP%' THEN 'COOP'
      WHEN ci.label LIKE '%(x%' THEN 'COOP'
      WHEN ci.label REGEXP '^S[0-9]' OR ci.label LIKE 'Sp%' OR ci.label LIKE 'S??'
        OR ci.label LIKE 'HD-%' OR ci.label LIKE 'aHD-%'
        OR ci.label LIKE 'CZ-%' OR ci.label LIKE 'aCZ-%'
        OR ci.label LIKE 'NL-%' OR ci.label LIKE 'aNL-%' THEN 'S'
      ELSE 'D'
    END
  `.execute(db);
  // Safety net for orphan shared_charts without any instance (none in prod data).
  await sql`UPDATE shared_charts SET type = 'S' WHERE type IS NULL`.execute(db);
  await sql`ALTER TABLE shared_charts MODIFY type ENUM('S','D','HD','COOP') NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // WARNING: on a prod-shaped database the column belongs to the tracklist
  // update process, not to this migration - only roll back on dev/test DBs.
  await sql`ALTER TABLE shared_charts DROP COLUMN type`.execute(db);
}
