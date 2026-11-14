import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('photo_reads')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('photo_sha256', 'char(64)', (col) => col.notNull())
    // USD, as OpenRouter charged it
    .addColumn('cost', sql`decimal(10, 6)`, (col) => col.notNull())
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('duplicate_result_id', 'integer')
    // A table-level constraint: MySQL 8 ignores `references` on a column
    .addForeignKeyConstraint(
      'photo_reads_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'photo_reads_duplicate_result_id_foreign',
      ['duplicate_result_id'],
      'results',
      ['id'],
      (constraint) => constraint.onDelete('set null')
    )
    .execute();
  await db.schema
    .createIndex('photo_reads_player_id_created_at')
    .on('photo_reads')
    .columns(['player_id', 'created_at'])
    .execute();
  await db.schema
    .createIndex('photo_reads_photo_sha256')
    .on('photo_reads')
    .column('photo_sha256')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('photo_reads').execute();
}
