import { Kysely, sql } from 'kysely';

/**
 * The history of players' total pp and places in the ranking, replacing pp_history and
 * pp_rank_history (one row per day, dropped later). A row is added whenever a place
 * changes, so a place held for a few minutes is kept, and when the total moves by 1pp or
 * more. Rows are only appended: ids are in time order. Filled by the API's
 * `npm run rebuild-pp-history`
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('player_rank_history')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('player_id', 'integer', (col) =>
      col.notNull().references('players.id').onDelete('cascade')
    )
    .addColumn('recorded_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('rank', 'integer', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('player_pp_history')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('player_id', 'integer', (col) =>
      col.notNull().references('players.id').onDelete('cascade')
    )
    .addColumn('recorded_at', sql`datetime(3)`, (col) => col.notNull())
    .addColumn('pp', sql`float(8, 2)`, (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('player_pp_history').execute();
  await db.schema.dropTable('player_rank_history').execute();
}
