import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('player_rank_history')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('recorded_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('rank', 'integer', (col) => col.notNull())
    .addForeignKeyConstraint(
      'player_rank_history_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .execute();

  await db.schema
    .createTable('player_pp_history')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('recorded_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('pp', sql`float(8, 2)`, (col) => col.notNull())
    .addForeignKeyConstraint(
      'player_pp_history_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('player_pp_history').execute();
  await db.schema.dropTable('player_rank_history').execute();
}
