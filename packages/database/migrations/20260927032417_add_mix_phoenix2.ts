import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // The legacy API reads the mix registry from this table; keep it in sync with
  // packages/core/src/constants/mixes.ts. Idempotent so it also applies to
  // databases where the row was already inserted manually.
  await sql`
    INSERT INTO mixes (id, name) VALUES (28, 'Phoenix2')
    ON DUPLICATE KEY UPDATE name = 'Phoenix2'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.deleteFrom('mixes').where('id', '=', 28).execute();
}
