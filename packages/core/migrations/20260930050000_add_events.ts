import { Kysely, sql } from 'kysely';

/**
 * P3 of the Python API migration (docs/python-api-migration/PLAN.md, "Events and
 * effects"): an outbox of domain events, and one cursor per consumer (the API's effects
 * worker, later the bot) holding the id of the last event it processed.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('events')
    .addColumn('id', 'integer', (col) => col.unsigned().autoIncrement().primaryKey())
    .addColumn('type', 'varchar(64)', (col) => col.notNull())
    .addColumn('payload', 'json', (col) => col.notNull())
    .addColumn('created_at', sql`datetime(3)`, (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('events_created_at_index')
    .on('events')
    .column('created_at')
    .execute();

  await db.schema
    .createTable('event_cursors')
    .addColumn('consumer', 'varchar(64)', (col) => col.primaryKey())
    .addColumn('event_id', 'integer', (col) => col.unsigned().notNull())
    .addColumn('updated_at', sql`datetime(3)`, (col) => col.notNull())
    .execute();

  // Events a consumer gave up on. They're kept when old events are deleted
  await db.schema
    .createTable('event_failures')
    .addColumn('consumer', 'varchar(64)', (col) => col.notNull())
    .addColumn('event_id', 'integer', (col) => col.unsigned().notNull())
    .addColumn('attempts', 'integer', (col) => col.notNull())
    .addColumn('error', 'text', (col) => col.notNull())
    .addColumn('failed_at', sql`datetime(3)`, (col) => col.notNull())
    .addPrimaryKeyConstraint('event_failures_primary', ['consumer', 'event_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('event_failures').execute();
  await db.schema.dropTable('event_cursors').execute();
  await db.schema.dropTable('events').execute();
}
