import { Kysely } from 'kysely';

/**
 * Drops the daily pp and rank history, replaced by player_pp_history and
 * player_rank_history. `down` recreates the tables empty: their data is gone
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pp_history').execute();
  await db.schema.dropTable('pp_rank_history').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('pp_history')
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('pp', 'decimal(8, 2)', (col) => col.notNull())
    .addForeignKeyConstraint(
      'pp_history_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addPrimaryKeyConstraint('date_player_id_primary', ['date', 'player_id'])
    .execute();

  await db.schema
    .createTable('pp_rank_history')
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('rank', 'integer', (col) => col.notNull())
    .addForeignKeyConstraint(
      'pp_rank_history_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addPrimaryKeyConstraint('pp_rank_history_date_player_id_primary', ['date', 'player_id'])
    .execute();
}
