import { Kysely, sql } from 'kysely';

/**
 * Migration B of the tournament relaunch (docs/tournaments/PLAN.md): the four
 * tables of the new cross-mix monthly tournament, built from scratch on top of
 * the names freed by the previous migration.
 *
 * Everything NOT NULL that can be: the new code never reads a legacy row and
 * never has to tolerate a missing value. `mix` is gone (a tournament is
 * cross-mix by definition), and so are `voting_end_date`, the level ranges and
 * `chart_instance_id` - the pool is shared across mixes, so it points at
 * `shared_charts`.
 *
 * Dates are naive "site wall-clock" DATETIMEs, compared in SQL against
 * `results.gained` only - never built as JS Dates and never passed through
 * `prepareForKnexUtc` (see the plan's "Date and time convention").
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('tournaments')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    // 'October 2026'
    .addColumn('name', 'varchar(64)', (col) => col.notNull())
    // 1st 00:00 / 25th 00:00, end exclusive; the unique key is also the
    // creation job's idempotency guard - one tournament per month.
    .addColumn('start_date', 'datetime', (col) => col.notNull())
    .addColumn('end_date', 'datetime', (col) => col.notNull())
    // Fully automatic: created Live, ended on the 25th. No Draft, no
    // ChartPoolVoting - the pool is public the moment it is drawn.
    .addColumn('state', sql`ENUM('Live', 'Ended')`, (col) => col.notNull().defaultTo(sql`'Live'`))
    .addColumn('created_at', 'datetime', (col) => col.notNull())
    .addPrimaryKeyConstraint('tournaments_primary', ['id'])
    .addUniqueConstraint('uq_tournaments_start_date', ['start_date'])
    .execute();

  // Who lands in the bracket (min_id/max_id, the *player* range) and how many
  // charts of each type they play. Which charts exactly is the ladder, and the
  // ladder lives in tournament_charts as drawn rows - one source of truth per
  // concept, which also makes a manual pool fix obvious.
  await db.schema
    .createTable('tournament_brackets')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('tournament_id', 'int', (col) => col.notNull())
    .addColumn('code', sql`ENUM('Easy', 'Mid', 'High', 'Top')`, (col) => col.notNull())
    .addColumn('name', 'varchar(40)', (col) => col.notNull())
    // NULL = the unrated bucket, which the Easy bracket also collects.
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

  // The drawn pool: one row per bracket chart, tagged with the ladder slot it
  // was drawn for, so a bad draw is fixable with a single UPDATE by hand.
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
    // Restricted on purpose, like the other shared_chart references: a deleted
    // chart must fail loudly rather than silently shrink a published pool.
    .addForeignKeyConstraint(
      'tournament_charts_shared_chart_id_foreign',
      ['shared_chart_id'],
      'shared_charts',
      ['id']
    )
    // A pool never repeats a chart (the legacy randomizer drew with replacement).
    .addUniqueConstraint('uq_tournament_charts_bracket_id_shared_chart_id', [
      'bracket_id',
      'shared_chart_id',
    ])
    .execute();

  // Skill snapshot taken at creation, so brackets are stable for the month: a
  // deleted result or a player un-hidden mid-month cannot move anyone, and the
  // 180-day skill scan runs once per month instead of per request.
  await db.schema
    .createTable('tournament_player_brackets')
    .addColumn('id', 'int', (col) => col.autoIncrement().notNull())
    .addColumn('tournament_id', 'int', (col) => col.notNull())
    .addColumn('bracket_id', 'int', (col) => col.notNull())
    .addColumn('player_id', 'int', (col) => col.notNull())
    // 5th-highest 950k+ chart level of the window; NULL = unrated -> Easy.
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
