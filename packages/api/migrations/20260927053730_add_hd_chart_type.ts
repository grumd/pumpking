import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE chart_instances MODIFY type ENUM('S','D','HD')`.execute(db);
  // Phoenix 2 half-double labels are 'HD' followed directly by a number (HD18).
  // The legacy 'HD-x' labels (mix 15-20) are a different chart family - leave their type NULL.
  await sql`UPDATE chart_instances SET type = 'HD' WHERE label REGEXP '^HD[0-9]'`.execute(db);
  // The mix 28 import skipped the original type backfill (see 20240110152230); restore it,
  // otherwise these charts are invisible to profile grade stats (join on type is not null).
  // All mix 28 S/D rows are NULL here, so `down` can revert exactly this set.
  await sql`UPDATE chart_instances SET type = 'S' WHERE mix = 28 AND label LIKE 'S%' AND type IS NULL`.execute(
    db
  );
  await sql`UPDATE chart_instances SET type = 'D' WHERE mix = 28 AND label LIKE 'D%' AND type IS NULL`.execute(
    db
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`UPDATE chart_instances SET type = NULL WHERE type = 'HD'`.execute(db);
  await sql`UPDATE chart_instances SET type = NULL WHERE mix = 28 AND (label LIKE 'S%' OR label LIKE 'D%')`.execute(
    db
  );
  await sql`ALTER TABLE chart_instances MODIFY type ENUM('S','D')`.execute(db);
}
