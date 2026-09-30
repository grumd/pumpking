import { Kysely, sql } from 'kysely';

/**
 * M7 of the tournament relaunch (docs/tournaments/PLAN.md): the final results
 * of an ended tournament, written once by the end job. From then on the ended
 * leaderboard is read from here, and cups are counted from `medal`.
 * `charts` freezes the per-chart bests shown on the leaderboard.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('tournament_results')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('tournament_id', 'int', (col) => col.notNull())
    .addColumn('bracket_id', 'int', (col) => col.notNull())
    .addColumn('player_id', 'int', (col) => col.notNull())
    .addColumn('rank', 'int', (col) => col.notNull())
    .addColumn('score', 'int', (col) => col.notNull())
    .addColumn('medal', sql`ENUM('gold', 'silver', 'bronze')`)
    .addColumn('charts', 'json', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull())
    .addPrimaryKeyConstraint('tournament_results_primary', ['id'])
    .addForeignKeyConstraint(
      'tournament_results_tournament_id_foreign',
      ['tournament_id'],
      'tournaments',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'tournament_results_bracket_id_foreign',
      ['bracket_id'],
      'tournament_brackets',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'tournament_results_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addUniqueConstraint('uq_tournament_results_tournament_id_player_id', [
      'tournament_id',
      'player_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('tournament_results').execute();
}
