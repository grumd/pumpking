import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('results').addColumn('photo_sha256', 'char(64)').execute();
  await db.schema
    .createIndex('results_photo_sha256_unique')
    .unique()
    .on('results')
    .column('photo_sha256')
    .execute();

  await db.schema
    .alterTable('players')
    .addColumn('ocr_cost', sql`decimal(10, 6)`, (col) => col.notNull().defaultTo(0))
    .execute();
  await sql`UPDATE players SET ocr_cost = openai_cost WHERE openai_cost IS NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('players').dropColumn('ocr_cost').execute();
  await db.schema.dropIndex('results_photo_sha256_unique').on('results').execute();
  await db.schema.alterTable('results').dropColumn('photo_sha256').execute();
}
