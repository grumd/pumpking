import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('bot_state')
    .addColumn('plugin', 'varchar(64)', (col) => col.notNull())
    .addColumn('key', 'varchar(64)', (col) => col.notNull())
    .addColumn('value', 'json', (col) => col.notNull())
    .addColumn('updated_at', sql`datetime(3)`, (col) => col.notNull())
    .addPrimaryKeyConstraint('bot_state_primary', ['plugin', 'key'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('bot_state').execute();
}
