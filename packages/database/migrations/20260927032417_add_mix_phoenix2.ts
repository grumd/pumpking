import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    INSERT INTO mixes (id, name) VALUES (28, 'Phoenix2')
    ON DUPLICATE KEY UPDATE name = 'Phoenix2'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.deleteFrom('mixes').where('id', '=', 28).execute();
}
