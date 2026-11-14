import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  const { rows } = await sql<{ c: number }>`
    SELECT COUNT(*) AS c
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'shared_charts'
      AND column_name = 'type'
  `.execute(db);
  if (rows.length > 0 && Number(rows[0].c) > 0) {
    return;
  }

  await sql`ALTER TABLE shared_charts ADD COLUMN type ENUM('S','D','HD','COOP') NULL`.execute(db);
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
  await sql`UPDATE shared_charts SET type = 'S' WHERE type IS NULL`.execute(db);
  await sql`ALTER TABLE shared_charts MODIFY type ENUM('S','D','HD','COOP') NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE shared_charts DROP COLUMN type`.execute(db);
}
