import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('tournaments')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('name', 'varchar(64)', (col) => col.notNull())
    .addColumn('start_date', 'datetime', (col) => col.notNull())
    .addColumn('end_date', 'datetime', (col) => col.notNull())
    .addColumn('state', sql`ENUM('Live', 'Ended')`, (col) => col.notNull().defaultTo(sql`'Live'`))
    .addColumn('created_at', 'datetime', (col) => col.notNull())
    .addPrimaryKeyConstraint('tournaments_primary', ['id'])
    .addUniqueConstraint('uq_tournaments_start_date', ['start_date'])
    .execute();

  await db.schema
    .createTable('tournament_brackets')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('tournament_id', 'int', (col) => col.notNull())
    .addColumn('code', sql`ENUM('Easy', 'Mid', 'High', 'Top')`, (col) => col.notNull())
    .addColumn('name', 'varchar(40)', (col) => col.notNull())
    .addColumn('min_id', 'decimal(4, 1)')
    .addColumn('max_id', 'decimal(4, 1)', (col) => col.notNull())
    .addColumn('singles_count', 'tinyint', (col) => col.notNull())
    .addColumn('doubles_count', 'tinyint', (col) => col.notNull())
    .addPrimaryKeyConstraint('tournament_brackets_primary', ['id'])
    .addForeignKeyConstraint(
      'tournament_brackets_tournament_id_foreign',
      ['tournament_id'],
      'tournaments',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addUniqueConstraint('uq_tournament_brackets_tournament_id_code', ['tournament_id', 'code'])
    .execute();

  await db.schema
    .createTable('tournament_charts')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('tournament_id', 'int', (col) => col.notNull())
    .addColumn('bracket_id', 'int', (col) => col.notNull())
    .addColumn('shared_chart_id', 'int', (col) => col.notNull())
    .addColumn('ladder_level', 'tinyint', (col) => col.notNull())
    .addColumn('ladder_type', sql`ENUM('S', 'D')`, (col) => col.notNull())
    .addPrimaryKeyConstraint('tournament_charts_primary', ['id'])
    .addForeignKeyConstraint(
      'tournament_charts_tournament_id_foreign',
      ['tournament_id'],
      'tournaments',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'tournament_charts_bracket_id_foreign',
      ['bracket_id'],
      'tournament_brackets',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'tournament_charts_shared_chart_id_foreign',
      ['shared_chart_id'],
      'shared_charts',
      ['id']
    )
    .addUniqueConstraint('uq_tournament_charts_bracket_id_shared_chart_id', [
      'bracket_id',
      'shared_chart_id',
    ])
    .execute();

  await db.schema
    .createTable('tournament_player_brackets')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('tournament_id', 'int', (col) => col.notNull())
    .addColumn('bracket_id', 'int', (col) => col.notNull())
    .addColumn('player_id', 'int', (col) => col.notNull())
    .addColumn('skill_level', 'tinyint')
    .addColumn('created_at', 'datetime', (col) => col.notNull())
    .addPrimaryKeyConstraint('tournament_player_brackets_primary', ['id'])
    .addForeignKeyConstraint(
      'tournament_player_brackets_tournament_id_foreign',
      ['tournament_id'],
      'tournaments',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'tournament_player_brackets_bracket_id_foreign',
      ['bracket_id'],
      'tournament_brackets',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addForeignKeyConstraint(
      'tournament_player_brackets_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addUniqueConstraint('uq_tournament_player_brackets_tournament_id_player_id', [
      'tournament_id',
      'player_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('tournament_player_brackets').execute();
  await db.schema.dropTable('tournament_charts').execute();
  await db.schema.dropTable('tournament_brackets').execute();
  await db.schema.dropTable('tournaments').execute();
}
