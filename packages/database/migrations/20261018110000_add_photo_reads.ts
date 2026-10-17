import { Kysely, sql } from 'kysely';

/**
 * Every paid read of a photo (docs/photo-results/PLAN.md, "Cost limits"). A read is
 * productive when a result with its photo hash exists; the limits count the spend of the
 * last days, with and without a result
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('photo_reads')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('photo_sha256', 'char(64)', (col) => col.notNull())
    // USD, as OpenRouter charged it
    .addColumn('cost', sql`decimal(10, 6)`, (col) => col.notNull())
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull())
    // A table-level constraint: MySQL 8 ignores `references` on a column
    .addForeignKeyConstraint(
      'photo_reads_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .execute();
  await db.schema
    .createIndex('photo_reads_player_id_created_at')
    .on('photo_reads')
    .columns(['player_id', 'created_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('photo_reads').execute();
}
