import { Kysely, sql } from 'kysely';

/**
 * Results read from photos (docs/photo-results/PLAN.md): the SHA-256 of the photo a result
 * was added from, so the same file is never read twice, and what reading photos cost each
 * player in USD. ocr_cost starts from openai_cost; the openai_* columns are dropped later,
 * once the old screenshot recognition is removed
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('results').addColumn('photo_sha256', 'char(64)').execute();
  // A unique index allows any number of NULLs
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
