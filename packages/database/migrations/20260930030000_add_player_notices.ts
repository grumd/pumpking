import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('player_notices')
    .addColumn('player_id', 'int', (col) => col.notNull())
    .addColumn('scope', 'varchar(32)', (col) => col.notNull())
    .addColumn('ref_id', 'int')
    .addColumn('created_at', 'datetime', (col) => col.notNull())
    .addColumn('read_at', 'datetime')
    .addPrimaryKeyConstraint('player_notices_primary', ['player_id', 'scope'])
    .addForeignKeyConstraint(
      'player_notices_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('player_notices').execute();
}
